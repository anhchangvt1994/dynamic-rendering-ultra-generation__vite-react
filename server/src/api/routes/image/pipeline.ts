/**
 * Upscales a small pixel-art animation (gif) into a crisp animated WebP.
 *
 * Per frame: bleed the edge colours into the transparent area (no dark fringe),
 * enlarge the colours (Scale2x, then lanczos; or Real-ESRGAN when a binary is
 * configured), and rebuild the alpha from a separately smoothed coverage mask
 * so a moving silhouette keeps a clean, anti-aliased edge instead of a
 * staircase. Frames go through one raw buffer, one at a time: bounded memory.
 */
import { spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import sharp from 'sharp'
import { smoothAlongTime, sourceChanges } from './temporal'

export const PIPELINE_VERSION = 15

export type PipelineOptions = {
  /** longest side of the output, px */
  size: number
  quality: number
  /** directory holding `realesrgan-ncnn-vulkan` and `models/`, optional (GPU) */
  esrganDir?: string
  /** model name in `models/` (default realesr-animevideov3-x3: clean, even lines; its name sets the scale) */
  esrganModel?: string
  /** ms the upscaler may run per pass; it is killed past that (no orphan) */
  esrganTimeoutMs?: number
  /** directory holding `rife-ncnn-vulkan` and `rife-v4.6/`: multiplies the fps */
  rifeDir?: string
  /** frames out per source frame when `rifeDir` is set (2–8, default 4) */
  fpsFactor?: number
  /** extra sharpening, for the last-resort source only (see sources.ts) */
  sharpen?: boolean
}

// Scale2x (EPX): staircase edges become clean curves; works on 32-bit pixels
function scale2x(src: Uint32Array, w: number, h: number) {
  const out = new Uint32Array(w * 2 * h * 2)
  const W = w * 2
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = src[y * w + x]
      const a = y > 0 ? src[(y - 1) * w + x] : 0
      const d = y < h - 1 ? src[(y + 1) * w + x] : 0
      const c = x > 0 ? src[y * w + x - 1] : 0
      const b = x < w - 1 ? src[y * w + x + 1] : 0
      let p1 = p
      let p2 = p
      let p3 = p
      let p4 = p
      if (c === a && c !== d && a !== b) p1 = a
      if (a === b && a !== c && b !== d) p2 = b
      if (d === c && d !== b && c !== a) p3 = c
      if (b === d && b !== a && d !== c) p4 = d
      const o = y * 2 * W + x * 2
      out[o] = p1
      out[o + 1] = p2
      out[o + W] = p3
      out[o + W + 1] = p4
    }
  return out
}

function smooth2x(rgba: Buffer, w: number, h: number, steps: number) {
  let cur = new Uint32Array(rgba.buffer, rgba.byteOffset, w * h).slice()
  for (let i = 0; i < cur.length; i++) if (cur[i] >>> 24 === 0) cur[i] = 0
  let cw = w
  let ch = h
  for (let s = 0; s < steps; s++) {
    cur = scale2x(cur, cw, ch)
    cw *= 2
    ch *= 2
  }
  return { data: cur, width: cw, height: ch }
}

/** Spreads edge colours into the transparent area; returns opaque RGBA + mask. */
function bleed(frame: Buffer, w: number, h: number) {
  const px = new Uint32Array(frame.buffer, frame.byteOffset, w * h).slice()
  const mask = Buffer.alloc(w * h)
  let known = new Uint8Array(w * h)
  for (let i = 0; i < px.length; i++)
    if (px[i] >>> 24 >= 128) {
      known[i] = 1
      mask[i] = 255
    }
  for (let pass = 0; pass < 6; pass++) {
    const next = known.slice()
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x
        if (known[i]) continue
        let r = 0
        let g = 0
        let b = 0
        let c = 0
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx
            const ny = y + dy
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
            const j = ny * w + nx
            if (!known[j]) continue
            r += px[j] & 255
            g += (px[j] >>> 8) & 255
            b += (px[j] >>> 16) & 255
            c++
          }
        if (c) {
          px[i] =
            (255 << 24) |
            (Math.round(b / c) << 16) |
            (Math.round(g / c) << 8) |
            Math.round(r / c)
          next[i] = 1
        }
      }
    known = next
  }
  for (let i = 0; i < px.length; i++)
    px[i] = known[i] ? (px[i] | 0xff000000) >>> 0 : 0xff000000
  return { rgba: Buffer.from(px.buffer, px.byteOffset, px.byteLength), mask }
}

/** Coverage mask -> smooth anti-aliased alpha at the target size. */
async function smoothMask(
  mask: Buffer,
  w: number,
  h: number,
  tw: number,
  th: number
) {
  const rgba = Buffer.alloc(w * h * 4)
  for (let i = 0; i < w * h; i++)
    if (mask[i]) rgba.writeUInt32LE(0xffffffff, i * 4)
  const s = smooth2x(rgba, w, h, 2)
  const gray = Buffer.alloc(s.width * s.height)
  for (let i = 0; i < gray.length; i++) gray[i] = s.data[i] & 255
  return sharp(gray, {
    raw: { width: s.width, height: s.height, channels: 1 },
  })
    .resize(tw, th, { kernel: 'lanczos3', fit: 'fill' })
    .blur(Math.max(0.6, (tw / w) * 0.28))
    .linear(5, -5 * 128 + 128)
    .extractChannel(0)
    .raw()
    .toBuffer()
}

const name = (f: number) => `${String(f).padStart(3, '0')}.png`


export async function upscaleAnimation(
  source: Buffer,
  {
    size,
    quality,
    esrganDir: dir,
    esrganModel = 'realesr-animevideov3-x3',
    esrganTimeoutMs,
    rifeDir,
    fpsFactor,
    sharpen = false,
  }: PipelineOptions
): Promise<Buffer> {
  const meta = await sharp(source, { animated: true, pages: -1 }).metadata()
  const { data, info } = await sharp(source, { animated: true, pages: -1 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const w = info.width
  const h = meta.pageHeight ?? info.height
  const n = Math.round(info.height / h)
  const esrganDir = dir ? path.resolve(dir) : undefined
  const useEsrgan =
    !!esrganDir && fs.existsSync(path.join(esrganDir, 'realesrgan-ncnn-vulkan'))
  const scale = Math.min(size / Math.max(w, h), useEsrgan ? 16 : Infinity)
  const tw = Math.round(w * scale)
  const th = Math.round(h * scale)
  const rifeBin =
    useEsrgan &&
    rifeDir &&
    fs.existsSync(path.join(rifeDir, 'rife-ncnn-vulkan'))
      ? path.resolve(rifeDir)
      : ''
  // browsers play frames shorter than ~20ms as 100ms, so k is capped by the
  // shortest source delay: more in-betweens would only make it slower
  const shortest = Math.min(...(meta.delay?.length ? meta.delay : [100]))
  const k = rifeBin
    ? Math.min(
        Math.round(fpsFactor || 4),
        8,
        Math.floor(Math.max(shortest, 20) / 20)
      )
    : 1
  const rife = k >= 2 ? rifeBin : ''
  const m = n * k // frames out
  const out = Buffer.allocUnsafe(tw * th * 4 * m)
  let colours = (f: number) => ''
  let masksAt = (f: number) => ''
  const frameAt = (f: number) =>
    Buffer.from(data.subarray(f * w * h * 4, (f + 1) * w * h * 4))

  let work = ''
  try {
    const masks: Buffer[] = []
    const bled: Buffer[] = []
    for (let f = 0; f < n; f++) {
      const b = bleed(frameAt(f), w, h)
      masks.push(b.mask)
      bled.push(b.rgba)
    }
    if (useEsrgan) {
      work = fs.mkdtempSync(path.join(os.tmpdir(), 'animated-'))
      fs.mkdirSync(path.join(work, 'in'))

      // colour and silhouette go through the same x4 passes (a 60px sprite
      // needs two): the mask gets the same vector-smooth edge as the colours
      for (let f = 0; f < n; f++) {
        await sharp(bled[f], { raw: { width: w, height: h, channels: 4 } })
          .removeAlpha()
          .png({ compressionLevel: 1 })
          .toFile(path.join(work, 'in', `c${name(f)}`))
        const gray = Buffer.alloc(w * h * 3)
        for (let i = 0; i < w * h; i++)
          gray.fill(masks[f][i] ? 255 : 0, i * 3, i * 3 + 3)
        await sharp(gray, { raw: { width: w, height: h, channels: 3 } })
          .png({ compressionLevel: 1 })
          .toFile(path.join(work, 'in', `m${name(f)}`))
      }
      // in-betweens come first, from the clean source frames, so every
      // output frame (real or invented) goes through the upscaler the same
      // way; the first frame closes the loop, so the last pair blends back
      if (rife) {
        const mix = path.join(work, 'mix')
        fs.mkdirSync(mix)
        for (const prefix of ['c', 'm']) {
          const input = path.join(work, `${prefix}-in`)
          const output = path.join(work, `${prefix}-out`)
          fs.mkdirSync(input)
          fs.mkdirSync(output)
          for (let f = 0; f <= n; f++)
            fs.copyFileSync(
              path.join(work, 'in', `${prefix}${name(f % n)}`),
              path.join(input, name(f))
            )
          const r = spawnSync(
            path.join(rife, 'rife-ncnn-vulkan'),
            [
              '-i',
              input,
              '-o',
              output,
              '-m',
              path.join(rife, 'rife-v4.6'),
              '-n',
              String((n + 1) * k),
              '-f',
              'png',
            ],
            {
              cwd: rife,
              encoding: 'utf8',
              timeout: esrganTimeoutMs,
              killSignal: 'SIGKILL',
            }
          )
          if (r.status !== 0) throw new Error('rife failed')
          for (let f = 0; f < m; f++)
            fs.renameSync(
              path.join(output, `${String(f + 1).padStart(8, '0')}.png`),
              path.join(mix, `${prefix}${name(f)}`)
            )
          fs.rmSync(input, { recursive: true, force: true })
          fs.rmSync(output, { recursive: true, force: true })
        }
        fs.rmSync(path.join(work, 'in'), { recursive: true, force: true })
        fs.renameSync(mix, path.join(work, 'in'))
      }
      // the model's own scale is the number at the end of its name
      const factor = Number(/x(\d)$/.exec(esrganModel)?.[1]) || 4
      const passes = scale > factor ? 2 : 1
      let from = path.join(work, 'in')
      for (let p = 1; p <= passes; p++) {
        const to = path.join(work, p === passes ? 'out' : `mid${p}`)
        fs.mkdirSync(to, { recursive: true })
        const run = spawnSync(
          path.join(esrganDir as string, 'realesrgan-ncnn-vulkan'),
          [
            '-i',
            from,
            '-o',
            to,
            '-n',
            esrganModel,
            '-s',
            String(factor),
            '-t',
            '128',
            '-j',
            '1:1:1',
            '-f',
            'png',
          ],
          {
            cwd: esrganDir,
            encoding: 'utf8',
            timeout: esrganTimeoutMs,
            killSignal: 'SIGKILL',
          }
        )
        if (run.status !== 0) throw new Error('realesrgan failed')
        if (p > 1) fs.rmSync(from, { recursive: true, force: true })
        from = to
        // a big source is already near the size after one pass: the next
        // pass only needs a quarter of the target, not a 2000px picture
        if (p < passes) {
          const cap = Math.ceil(Math.max(tw, th) / factor)
          for (const file of fs.readdirSync(from)) {
            const full = path.join(from, file)
            const big = await sharp(full).metadata()
            if (Math.max(big.width ?? 0, big.height ?? 0) <= cap * 1.25)
              continue
            const buf = await sharp(full)
              .resize(Math.ceil(tw / factor), Math.ceil(th / factor), {
                kernel: 'lanczos3',
                fit: 'fill',
              })
              .png({ compressionLevel: 1 })
              .toBuffer()
            fs.writeFileSync(full, buf)
          }
        }
      }
    }
    if (useEsrgan) {
      colours = (f) => path.join(work, 'out', `c${name(f)}`)
      masksAt = (f) => path.join(work, 'out', `m${name(f)}`)
    }
    for (let f = 0; f < m; f++) {
      const colour = useEsrgan
        ? sharp(colours(f))
        : (() => {
            const s = smooth2x(bled[f], w, h, 2)
            return sharp(
              Buffer.from(s.data.buffer, s.data.byteOffset, s.data.byteLength),
              {
                raw: { width: s.width, height: s.height, channels: 4 },
              }
            )
          })()
      let scaled = colour
        .removeAlpha()
        .resize(tw, th, { kernel: 'lanczos3', fit: 'fill' })
      // the sharp-only path ends soft after the last stretch: bring it back;
      // the last-resort source (blurrier) gets it on the ESRGAN path too
      if (!useEsrgan || sharpen)
        scaled = scaled.sharpen({ sigma: 0.7, m1: 0.3, m2: 1.5 })
      const rgb = await scaled.raw().toBuffer()
      const alpha = useEsrgan
        ? await sharp(masksAt(f))
            .extractChannel(0)
            .resize(tw, th, { kernel: 'lanczos3', fit: 'fill' })
            .blur(5)
            .linear(6, -6 * 150 + 128)
            .raw()
            .toBuffer()
        : await smoothMask(masks[f], w, h, tw, th)
      const base = f * tw * th * 4
      for (let i = 0; i < tw * th; i++) {
        out[base + i * 4] = rgb[i * 3]
        out[base + i * 4 + 1] = rgb[i * 3 + 1]
        out[base + i * 4 + 2] = rgb[i * 3 + 2]
        out[base + i * 4 + 3] = alpha[i]
      }
    }
  } finally {
    if (work) fs.rmSync(work, { recursive: true, force: true })
  }

  // The upscaler and RIFE leave a little frame-to-frame flicker (edges and
  // colours shifting a pixel or two): a blend along time averages it out,
  // only where the source frames say nothing moved (no double strokes)
  if (m > 2)
    await smoothAlongTime(out, {
      w,
      h,
      tw,
      th,
      frames: m,
      k,
      changes: sourceChanges(
        Array.from({ length: n }, (_, f) => frameAt(f)),
        w,
        h
      ),
    })

  return sharp(out, {
    raw: { width: tw, height: th * m, channels: 4, pageHeight: th },
  })
    .webp({
      quality,
      alphaQuality: 100,
      effort: 5,
      loop: 0,
      delay: rife
        ? (meta.delay ?? []).flatMap((d) => Array(k).fill(Math.round(d / k)))
        : meta.delay,
      smartSubsample: true,
    })
    .toBuffer()
}
