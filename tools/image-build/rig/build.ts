/**
 * One species' rig for the room: the sprite sheet of its displayed frames,
 * the flow of each frame back to frame 0, its colour regions and the
 * skeleton of its main region. Frames are decoded a batch at a time, so a
 * long 800px animation never sits in memory whole.
 */
import sharp from 'sharp'
import { clusterColors, overrideFor, primaryMask } from './clusters'
import type { Cluster, Lock } from './clusters'
import { fieldFor, flowSheet, premultiplied, TILE, writeTile } from './flow'
import { cellOf, encodeSheet, sheetPlan } from './sheet'
import { skeleton } from './skeleton'
import type { Branch } from './skeleton'
import { eyeMask } from './eye'

export { sheetPlan } from './sheet'

// 3: per-frame eye protection mask
// 4: eye mask recomputed (cached v3 masks missed most of the sclera)
// 5: eye rim accepts mid-dark outlines, so every animation frame keeps its mask
// 6: lower-resolution optical flow (128px)
// 7: eye protection is limited to compact upper-face components
// 8: rollback to the original 256px optical flow (128px made colours flicker
//    and marks lose the skin); the eye mask stays
// 9: flow.webp, lossless (flow.png was 4x larger); sheet encoded at effort 6
export const RIG_VERSION = 9
/** longest side the flow is computed at */
const FLOW_SIDE = 256
const PRIMARY = 64
const BATCH = 16
const CLUSTER_FRAMES = 16

export type RigJson = {
  v: typeof RIG_VERSION
  /** one sheet cell, px */
  frame: { w: number; h: number }
  sheet: { cols: number; size: number }
  frames: number
  /** ms, one per frame */
  delays: number[]
  /** source frames, displayed frames per source frame */
  src: { n: number; k: number }
  flow: { cols: number; tile: number; bits: 8 }
  clusters: Cluster[]
  lock: Lock
  /** size² cells, row by row, 1 bit each (MSB first), base64 */
  primary: { size: number; bits: string }
  branches: Branch[]
  noMarks?: true
}

const pack = (mask: Uint8Array) => {
  const bytes = Buffer.alloc(Math.ceil(mask.length / 8))
  mask.forEach((on, i) => {
    if (on) bytes[i >> 3] |= 0x80 >> (i & 7)
  })
  return bytes.toString('base64')
}

// pages start..start+count-1, each resized to w×h, straight RGBA
async function decode(
  image: Buffer,
  animated: boolean,
  start: number,
  count: number,
  width: number,
  w: number,
  h: number
) {
  const { data } = await sharp(
    image,
    animated
      ? { animated: true, page: start, pages: count, limitInputPixels: false }
      : { page: 0 }
  )
    .ensureAlpha()
    .resize({
      width: w,
      height: h,
      fit: 'fill',
      kernel: w > width ? 'nearest' : 'lanczos3',
    })
    .raw()
    .toBuffer({ resolveWithObject: true })
  const size = w * h * 4
  return Array.from({ length: count }, (_, i) =>
    Uint8Array.from(data.subarray(i * size, (i + 1) * size))
  )
}

/**
 * The rig of an animated WebP (the upscaled one) and its source GIF, or of a
 * still alone: one frame lasting a second. `key` picks the hand overrides.
 */
export async function buildRig(
  source: Buffer | null,
  animatedWebp: Buffer | null,
  still: Buffer | null,
  key?: string | number,
  { sheetQuality = 90 }: { sheetQuality?: number } = {}
): Promise<{ json: RigJson; sheet: Buffer; flow: Buffer; eye: Buffer }> {
  const image = animatedWebp ?? still ?? source
  if (!image) throw new Error('a rig needs an image')
  const animated = !!animatedWebp
  const meta = await sharp(
    image,
    animated ? { animated: true, limitInputPixels: false } : {}
  ).metadata()
  const W = meta.width!
  const H = animated ? (meta.pageHeight ?? meta.height!) : meta.height!
  const m = animated ? (meta.pages ?? 1) : 1
  const n =
    animated && source
      ? ((
          await sharp(source, {
            animated: true,
            limitInputPixels: false,
          }).metadata()
        ).pages ?? 1)
      : m
  const plan = sheetPlan(m, animated ? (meta.delay ?? []) : [1000])
  const cell = cellOf(W, H, plan.size)
  const fl = cellOf(W, H, FLOW_SIDE)
  const flow = flowSheet(plan.keep.length)
  const kept = new Map(plan.keep.map((f, K) => [f, K]))
  const every = Math.max(1, Math.ceil(plan.keep.length / CLUSTER_FRAMES))
  const cells: Uint8Array[] = []
  const eyeSheet = Buffer.alloc(plan.cols * cell.w * plan.rows * cell.h)
  const sampled: Uint8Array[] = []
  let first: Float32Array | null = null
  let straightFirst: Uint8Array | null = null
  for (let start = 0; start < m; start += BATCH) {
    const count = Math.min(BATCH, m - start)
    const wanted = Array.from({ length: count }, (_, i) => start + i).filter(
      (f) => kept.has(f)
    )
    if (!wanted.length) continue
    const big = await decode(image, animated, start, count, W, cell.w, cell.h)
    const small = await decode(image, animated, start, count, W, fl.w, fl.h)
    for (const f of wanted) {
      const K = kept.get(f)!
      const straight = small[f - start]
      const frame = premultiplied(straight, fl.w, fl.h)
      if (!first) {
        first = frame
        straightFirst = straight
      }
      cells.push(big[f - start])
      const eye = eyeMask(big[f - start], cell.w, cell.h)
      const ex = (K % plan.cols) * cell.w
      const ey = Math.floor(K / plan.cols) * cell.h
      for (let y = 0; y < cell.h; y++)
        eyeSheet.set(
          eye.subarray(y * cell.w, (y + 1) * cell.w),
          (ey + y) * plan.cols * cell.w + ex
        )
      if (K % every === 0) sampled.push(straight)
      writeTile(
        flow,
        K,
        await fieldFor(frame, first, fl.w, fl.h, K),
        fl.w,
        fl.h
      )
    }
  }
  const override = key === undefined ? undefined : overrideFor(key)
  const { clusters, lock } = clusterColors(sampled, fl.w, fl.h, override)
  const mask = primaryMask(straightFirst!, fl.w, fl.h, clusters, lock, PRIMARY)
  const json: RigJson = {
    v: RIG_VERSION,
    frame: { w: cell.w, h: cell.h },
    sheet: { cols: plan.cols, size: plan.size },
    frames: plan.keep.length,
    delays: plan.delays,
    src: { n, k: m / n },
    flow: { cols: flow.cols, tile: TILE, bits: 8 },
    clusters,
    lock,
    primary: { size: PRIMARY, bits: pack(mask) },
    branches: skeleton(mask, PRIMARY).branches,
    ...(override?.noMarks ? { noMarks: true as const } : {}),
  }
  const [sheet, flowPng, eyePng] = await Promise.all([
    encodeSheet(cells, cell.w, cell.h, plan.cols, plan.rows, sheetQuality),
    sharp(flow.data, {
      raw: { width: flow.width, height: flow.height, channels: 4 },
    })
      // coordinates, not colours: lossless, and the RGB kept as written
      .webp({ lossless: true, effort: 6 })
      .toBuffer(),
    sharp(Buffer.from(eyeSheet), {
      raw: {
        width: plan.cols * cell.w,
        height: plan.rows * cell.h,
        channels: 1,
      },
    })
      .png({ palette: false, compressionLevel: 9 })
      .toBuffer(),
  ])
  return { json, sheet, flow: flowPng, eye: eyePng }
}
