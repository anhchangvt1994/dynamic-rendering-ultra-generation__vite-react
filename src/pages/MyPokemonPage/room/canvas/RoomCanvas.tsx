import { useEffect, useRef } from 'react'
import type { Appearance } from 'pages/BagPage/individuals/client'
import { paletteUniforms } from './colour.mjs'
import type { MarkLayer, Scene3 } from './gl'
import { bodyMask, drawMarks, planMarks } from './marks.mjs'
import { loadRig } from './rig'
import type { Rig } from './rig'
import { trackMarks } from './track.mjs'

export type CanvasState = 'on' | 'lost' | 'off'

type Props = {
  speciesId: number
  appearance: Appearance
  mood?: string
  back: boolean
  /** the <img> shows the animation, not the still the server shows while it builds one */
  animated: boolean
  /**
   * 'on' once a frame is painted; 'lost' while the context is gone (it may
   * come back); 'off' when it gives up
   */
  onReady: (state: CanvasState) => void
}

const MARKS_PX = 512

type Body = ReturnType<typeof bodyMask> | null
const bodies = new WeakMap<Rig, Body>()

// the silhouette marks spread over, read once per rig from sheet frame 0;
// null (the main region stands in) when the pixels can not be read
function bodyOf(rig: Rig): Body {
  if (bodies.has(rig)) return bodies.get(rig) ?? null
  let body: Body = null
  try {
    const { w, h } = rig.json.frame
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (ctx) {
      ctx.drawImage(rig.sheet, 0, 0, w, h, 0, 0, w, h)
      body = bodyMask(
        ctx.getImageData(0, 0, w, h).data,
        w,
        h,
        rig.json.clusters,
        rig.json.lock,
        rig.json.primary?.size
      )
    }
  } catch {
    // a tainted or lost canvas: plan on the main region
  }
  bodies.set(rig, body)
  return body
}

// the flow's bytes (u, v, confidence per cell), read once per rig
const flows = new WeakMap<Rig, ImageData | null>()
function flowOf(rig: Rig) {
  if (flows.has(rig)) return flows.get(rig) ?? null
  let data: ImageData | null = null
  try {
    const { width, height } = rig.flow
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (ctx) {
      ctx.drawImage(rig.flow, 0, 0)
      data = ctx.getImageData(0, 0, width, height)
    }
  } catch {
    // unreadable: the marks stay where frame 0 has them
  }
  flows.set(rig, data)
  return data
}

// each frame's alpha laid out like the flow (one tile per frame), read once
// per rig: where a mark's place went behind the body, trackMarks hides it
const sheetAlphas = new WeakMap<Rig, ImageData | null>()
function sheetAlphaOf(rig: Rig) {
  if (sheetAlphas.has(rig)) return sheetAlphas.get(rig) ?? null
  let data: ImageData | null = null
  try {
    const { frames, frame, sheet, flow } = rig.json
    const cols = sheet.cols
    const { width, height } = rig.flow
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (ctx) {
      for (let K = 0; K < frames; K++)
        ctx.drawImage(
          rig.sheet,
          (K % cols) * frame.w,
          Math.floor(K / cols) * frame.h,
          frame.w,
          frame.h,
          (K % flow.cols) * flow.tile,
          Math.floor(K / flow.cols) * flow.tile,
          flow.tile,
          flow.tile
        )
      data = ctx.getImageData(0, 0, width, height)
    }
  } catch {
    // unreadable: every mark shows
  }
  sheetAlphas.set(rig, data)
  return data
}

function marksFor(
  rig: Rig,
  appearance: Appearance,
  glow: boolean
): MarkLayer | null {
  if (!appearance.marks) return null
  const shapes = planMarks(appearance.marks, rig.json, bodyOf(rig))
  if (!shapes.length) return null
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = MARKS_PX
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const flow = flowOf(rig)
  const frames = flow ? trackMarks(shapes, flow, rig.json, sheetAlphaOf(rig) ?? undefined)
    : [shapes]
  let shown = -1
  return {
    canvas,
    frame(K) {
      const i = Math.min(K, frames.length - 1)
      if (i === shown) return false
      shown = i
      ctx.clearRect(0, 0, MARKS_PX, MARKS_PX)
      drawMarks(ctx, frames[i], MARKS_PX, rig.json.frame, { glow })
      return true
    },
  }
}

/**
 * The individual in the room as it really looks: its species' animation
 * through the palette and marks shader (gl.ts, loaded on demand). Sits over
 * the <img>, the same box; tells RoomSprite when it can hide the picture,
 * or when to keep it (no rig, no WebGL, a lost context).
 */
export default function RoomCanvas({
  speciesId,
  appearance,
  mood,
  back,
  animated,
  onReady,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const scene = useRef<Scene3 | null>(null)
  const ready = useRef(onReady)
  ready.current = onReady
  const look = useRef({ mood, back })
  look.current = { mood, back }
  const paint = useRef<() => void>(() => {})
  // a reloaded list hands over equal looks as new objects: only a new look
  // starts over
  const look_ = JSON.stringify(appearance)
  const appearanceRef = useRef(appearance)
  appearanceRef.current = appearance

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const abort = new AbortController()
    let frame = 0
    let elapsed = 0
    let last = 0
    let raf = 0
    let visible = true
    let restored = false
    let rig: Rig | null = null
    const still = window.matchMedia('(prefers-reduced-motion: reduce)')

    const size = () => {
      const s = scene.current
      if (!s) return
      const { width, height } = canvas.getBoundingClientRect()
      if (!width || !height) return
      s.setSize(width, height, Math.min(window.devicePixelRatio || 1, 2))
    }
    const draw = () => {
      const s = scene.current
      if (!s) return
      s.setMood(look.current.mood)
      s.setFlip(look.current.back)
      s.setFrame(frame)
      s.render()
    }
    paint.current = draw
    const running = () =>
      !!rig &&
      rig.json.frames > 1 &&
      visible &&
      !document.hidden &&
      !still.matches
    const tick = (now: number) => {
      raf = 0
      if (!rig || !running()) return
      elapsed += last ? Math.min(now - last, 250) : 0
      last = now
      const { delays, frames } = rig.json
      let moved = false
      while (elapsed >= (delays[frame] || 100)) {
        elapsed -= delays[frame] || 100
        frame = (frame + 1) % frames
        moved = true
      }
      if (moved) draw()
      raf = requestAnimationFrame(tick)
    }
    const wake = () => {
      if (still.matches) {
        frame = 0
        draw()
      }
      if (raf || !running()) return
      last = 0
      raf = requestAnimationFrame(tick)
    }
    const sleep = () => {
      cancelAnimationFrame(raf)
      raf = 0
    }
    const onVisibility = () => (document.hidden ? sleep() : wake())

    const build = async () => {
      if (!rig) return false
      const { startScene } = await import('./gl')
      if (abort.signal.aborted) return false
      try {
        const colours = paletteUniforms(appearanceRef.current, rig.json.clusters)
        scene.current = startScene(
          canvas,
          rig,
          colours,
          marksFor(rig, appearanceRef.current, colours.glow)
        )
      } catch {
        return false
      }
      size()
      draw()
      return true
    }

    const lost = (event: Event) => {
      event.preventDefault()
      sleep()
      ready.current('lost')
    }
    const back_ = async () => {
      if (restored) return
      restored = true
      // forcing a loss here would lose the context that just came back
      scene.current?.dispose(true)
      scene.current = null
      if (await build()) {
        ready.current('on')
        wake()
      } else if (!abort.signal.aborted) ready.current('off')
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) wake()
      else sleep()
    })
    const resized = new ResizeObserver(() => {
      size()
      draw()
    })

    loadRig(speciesId, abort.signal)
      .then(async (loaded) => {
        if (abort.signal.aborted) return
        // an animated rig over the still would sit off its fitted box
        rig = loaded && (animated || loaded.json.frames === 1) ? loaded : null
        if (!(await build())) {
          if (!abort.signal.aborted) ready.current('off')
          return
        }
        ready.current('on')
        canvas.addEventListener('webglcontextlost', lost)
        canvas.addEventListener('webglcontextrestored', back_)
        document.addEventListener('visibilitychange', onVisibility)
        still.addEventListener('change', wake)
        observer.observe(canvas)
        resized.observe(canvas)
        wake()
      })
      .catch(() => {
        if (!abort.signal.aborted) ready.current('off')
      })

    return () => {
      abort.abort()
      sleep()
      observer.disconnect()
      resized.disconnect()
      canvas.removeEventListener('webglcontextlost', lost)
      canvas.removeEventListener('webglcontextrestored', back_)
      document.removeEventListener('visibilitychange', onVisibility)
      still.removeEventListener('change', wake)
      scene.current?.dispose()
      scene.current = null
    }
    // a new species or a new look starts over
  }, [speciesId, look_, animated])

  useEffect(() => paint.current(), [mood, back])

  return <canvas ref={ref} className="rm-canvas" aria-hidden="true" />
}
