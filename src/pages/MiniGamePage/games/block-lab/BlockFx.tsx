import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { burst, stepParticles } from './fx.mjs'

export type FxKind = 'shatter' | 'firework' | 'impact'
export type FxHandle = { emit: (kind: FxKind, x: number, y: number, opts?: { power?: number; hue?: number }) => void; clear: () => void }

/** One canvas for every particle. Its frame loop runs only while particles are alive. */
const BlockFx = forwardRef<FxHandle>(function BlockFx(_, ref) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const list = useRef<any[]>([])
  const raf = useRef(0)
  const last = useRef(0)

  const frame = useCallback((now: number) => {
    const el = canvas.current
    const ctx = el?.getContext('2d')
    if (!el || !ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.round(el.clientWidth * dpr)
    const h = Math.round(el.clientHeight * dpr)
    if (el.width !== w || el.height !== h) {
      el.width = w
      el.height = h
    }
    const dt = Math.min(now - last.current, 50)
    last.current = now
    list.current = stepParticles(list.current, dt)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, el.clientWidth, el.clientHeight)
    for (const p of list.current) {
      ctx.globalAlpha = Math.min(1, (p.life / p.max) * 1.6)
      ctx.fillStyle = `hsl(${p.hue} 95% ${p.kind === 'impact' ? 85 : 62}%)`
      if (p.kind === 'shatter') {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7)
        ctx.restore()
      } else if (p.kind === 'impact') {
        ctx.fillRect(p.x - 1, p.y, 2, p.size * 5)
      } else {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
    if (list.current.length) raf.current = requestAnimationFrame(frame)
    else {
      raf.current = 0
      ctx.clearRect(0, 0, el.clientWidth, el.clientHeight)
    }
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      emit(kind, x, y, opts) {
        list.current = list.current.concat(burst(kind, { x, y }, Math.random, { ...opts, existing: list.current.length }))
        if (!raf.current && list.current.length) {
          last.current = performance.now()
          raf.current = requestAnimationFrame(frame)
        }
      },
      clear() {
        list.current = []
      },
    }),
    [frame],
  )
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  return <canvas ref={canvas} className="block-lab-fx" aria-hidden="true" />
})

export default BlockFx
