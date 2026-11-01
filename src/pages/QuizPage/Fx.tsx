import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

type Shape = 'star' | 'rect' | 'dot'

export type Burst = {
  /** where, as fractions of the stage (0–1) */
  x: number
  y: number
  count: number
  colors: string[]
  /** start speed, px per frame at 60 fps */
  speed: number
  /** direction (radians, 0 = right, -π/2 = up) and the cone around it */
  angle?: number
  spread?: number
  gravity?: number
  shapes?: Shape[]
  /** ms */
  life?: number
  /** particle size, 1 = confetti */
  size?: number
}

export type FxHandle = {
  burst: (burst: Burst) => void
  clear: () => void
}

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  spin: number
  size: number
  color: string
  shape: Shape
  gravity: number
  life: number
  age: number
}

const star = (context: CanvasRenderingContext2D, radius: number) => {
  context.beginPath()
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? radius * 0.45 : radius
    const a = (i * Math.PI) / 5 - Math.PI / 2
    context.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  context.closePath()
  context.fill()
}

/**
 * Particles over the stage: stars, confetti and sparks thrown by the capture
 * and the milestones. A canvas that only runs while something flies: no
 * frame is drawn once the last particle is gone.
 */
const Fx = forwardRef<FxHandle>(function Fx(_, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particles = useRef<Particle[]>([])
  const frame = useRef(0)
  const last = useRef(0)

  const tick = (now: number) => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    // a slow frame moves particles further instead of slowing them down
    const step = Math.min(now - last.current, 40) / 16.67
    last.current = now
    const ratio = canvas.width / canvas.clientWidth
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, canvas.width, canvas.height)

    particles.current = particles.current.filter((p) => {
      p.age += step * 16.67
      if (p.age >= p.life) return false
      p.vy += p.gravity * step
      p.vx *= 0.985 ** step
      p.vy *= 0.985 ** step
      p.x += p.vx * step
      p.y += p.vy * step
      p.rotation += p.spin * step
      const fade = 1 - p.age / p.life
      context.globalAlpha = Math.min(1, fade * 1.6)
      context.fillStyle = p.color
      context.setTransform(
        ratio * Math.cos(p.rotation),
        ratio * Math.sin(p.rotation),
        -ratio * Math.sin(p.rotation),
        ratio * Math.cos(p.rotation),
        p.x * ratio,
        p.y * ratio
      )
      if (p.shape === 'star') star(context, p.size)
      else if (p.shape === 'dot') {
        context.beginPath()
        context.arc(0, 0, p.size * 0.6, 0, Math.PI * 2)
        context.fill()
      } else {
        // confetti flutters: its width follows the spin
        const width = p.size * Math.abs(Math.cos(p.rotation * 2)) + 1
        context.fillRect(-width / 2, -p.size * 0.35, width, p.size * 0.7)
      }
      return true
    })

    if (particles.current.length) frame.current = requestAnimationFrame(tick)
    else {
      context.setTransform(1, 0, 0, 1, 0, 0)
      context.clearRect(0, 0, canvas.width, canvas.height)
      frame.current = 0
    }
  }

  useImperativeHandle(ref, () => ({
    burst({
      x,
      y,
      count,
      colors,
      speed,
      angle = 0,
      spread = Math.PI * 2,
      gravity = 0.25,
      shapes = ['star', 'rect', 'dot'],
      life = 1300,
      size = 1,
    }) {
      const canvas = canvasRef.current
      if (!canvas) return
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      if (canvas.width !== Math.round(width * ratio)) {
        canvas.width = Math.round(width * ratio)
        canvas.height = Math.round(height * ratio)
      }
      // sized to the stage: a desktop stage throws further than a phone's
      const scale = width / 380
      for (let i = 0; i < count; i++) {
        const direction = angle + (Math.random() - 0.5) * spread
        const velocity = speed * scale * (0.35 + Math.random() * 0.75)
        particles.current.push({
          x: x * width,
          y: y * height,
          vx: Math.cos(direction) * velocity,
          vy: Math.sin(direction) * velocity,
          rotation: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 0.4,
          size: (4 + Math.random() * 6) * Math.max(0.8, scale * 0.8) * size,
          color: colors[Math.floor(Math.random() * colors.length)],
          shape: shapes[Math.floor(Math.random() * shapes.length)],
          gravity: gravity * scale,
          life: life * (0.6 + Math.random() * 0.5),
          age: 0,
        })
      }
      if (!frame.current) {
        last.current = performance.now()
        frame.current = requestAnimationFrame(tick)
      }
    },
    clear() {
      particles.current = []
    },
  }))

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  return <canvas ref={canvasRef} className="fx" aria-hidden="true" />
})

export default Fx
