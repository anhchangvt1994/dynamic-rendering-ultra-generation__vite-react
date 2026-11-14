import { CanvasTexture, Color, SRGBColorSpace, PerspectiveCamera, Scene, Sprite, SpriteMaterial, Vector3 } from 'three'
import { pixelsOf } from '../framing.mjs'

export type Burst = 'star' | 'heart' | 'dot'
type P = { s: Sprite; v: Vector3; life: number; max: number; px: number; spin: number }

const draw = (kind: Burst) => {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  g.fillStyle = '#fff'
  g.strokeStyle = '#3b2a52'
  g.lineWidth = 5
  g.lineJoin = 'round'
  g.beginPath()
  if (kind === 'star') {
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 11 : 27
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2
      g.lineTo(32 + Math.cos(a) * r, 33 + Math.sin(a) * r)
    }
    g.closePath()
  } else if (kind === 'heart') {
    g.moveTo(32, 54)
    g.bezierCurveTo(4, 34, 10, 8, 32, 22)
    g.bezierCurveTo(54, 8, 60, 34, 32, 54)
  } else g.arc(32, 32, 20, 0, Math.PI * 2)
  g.stroke()
  g.fill()
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

/** A pool of little stars, hearts and dots that pop out of whatever you hover. */
export function createParticles(scene: Scene, size = 90) {
  const tex: Record<Burst, CanvasTexture> = { star: draw('star'), heart: draw('heart'), dot: draw('dot') }
  const pool: P[] = Array.from({ length: size }, () => {
    const s = new Sprite(new SpriteMaterial({ map: tex.star, transparent: true, depthWrite: false, depthTest: false }))
    s.visible = false
    s.renderOrder = 20
    scene.add(s)
    return { s, v: new Vector3(), life: 0, max: 1, px: 16, spin: 0 }
  })
  let cursor = 0
  const palette = ['#ff7aa8', '#ffd24a', '#5fe3b4', '#7ac8ff', '#c79bff', '#ff9a4a']
  return {
    burst(at: Vector3, colours: string[] | null, kind: Burst = 'star', count = 10, speed = 1) {
      for (let i = 0; i < count; i++) {
        const p = pool[cursor++ % pool.length]
        const a = (i / count) * Math.PI * 2 + Math.random()
        p.s.material.map = tex[kind]
        p.s.material.color = new Color((colours ?? palette)[i % (colours ?? palette).length])
        p.s.material.needsUpdate = true
        p.s.position.copy(at)
        p.v.set(Math.cos(a) * (0.6 + Math.random() * 0.8), 1.2 + Math.random() * 1.2, Math.sin(a) * (0.6 + Math.random() * 0.8)).multiplyScalar(speed)
        p.max = p.life = 0.7 + Math.random() * 0.5
        p.px = 12 + Math.random() * 12
        p.spin = (Math.random() - 0.5) * 6
        p.s.visible = true
      }
    },
    update(dt: number, camera: PerspectiveCamera, viewportH: number) {
      for (const p of pool) {
        if (p.life <= 0) continue
        p.life -= dt
        if (p.life <= 0) {
          p.s.visible = false
          continue
        }
        const dist = camera.position.distanceTo(p.s.position)
        const unit = dist * 0.18
        p.v.y -= dt * 2.4
        p.s.position.addScaledVector(p.v, dt * unit)
        const k = p.life / p.max
        const s = ((p.px * (0.4 + 0.6 * Math.min(1, k * 2))) * 2 * dist * Math.tan((camera.fov * Math.PI) / 360)) / viewportH
        p.s.scale.set(s, s, 1)
        p.s.material.rotation += p.spin * dt
        p.s.material.opacity = Math.min(1, k * 3)
      }
    },
    dispose() {
      for (const p of pool) {
        scene.remove(p.s)
        p.s.material.dispose()
      }
      Object.values(tex).forEach((t) => t.dispose())
    },
  }
}
export type Particles = ReturnType<typeof createParticles>
void pixelsOf
