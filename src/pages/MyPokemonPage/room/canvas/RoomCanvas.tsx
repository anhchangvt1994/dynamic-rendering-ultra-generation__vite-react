import { useEffect, useRef } from 'react'
import type { Appearance } from 'pages/BagPage/individuals/client'
import { paletteUniforms } from './colour.mjs'
import type { Scene3 } from './gl'
import { drawMarks, planMarks } from './marks.mjs'
import { loadRig } from './rig'
import type { Rig } from './rig'

type Props = {
  speciesId: number
  appearance: Appearance
  mood?: string
  back: boolean
  /** the <img> shows the animation, not the still the server shows while it builds one */
  animated: boolean
  /** true once its first frame is painted; false when it gives up */
  onReady: (ok: boolean) => void
}

const MARKS_PX = 512

function marksFor(rig: Rig, appearance: Appearance) {
  const shapes = planMarks(appearance.marks, rig.json)
  if (!shapes.length) return null
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = MARKS_PX
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  drawMarks(ctx, shapes, MARKS_PX, rig.json.frame)
  return canvas
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
        scene.current = startScene(
          canvas,
          rig,
          paletteUniforms(appearance, rig.json.clusters),
          marksFor(rig, appearance)
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
      ready.current(false)
    }
    const back_ = async () => {
      if (restored) return
      restored = true
      scene.current?.dispose()
      scene.current = null
      if (await build()) {
        ready.current(true)
        wake()
      }
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
          if (!abort.signal.aborted) ready.current(false)
          return
        }
        ready.current(true)
        canvas.addEventListener('webglcontextlost', lost)
        canvas.addEventListener('webglcontextrestored', back_)
        document.addEventListener('visibilitychange', onVisibility)
        still.addEventListener('change', wake)
        observer.observe(canvas)
        resized.observe(canvas)
        wake()
      })
      .catch(() => {
        if (!abort.signal.aborted) ready.current(false)
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
  }, [speciesId, appearance, animated])

  useEffect(() => paint.current(), [mood, back])

  return <canvas ref={ref} className="rm-canvas" aria-hidden="true" />
}
