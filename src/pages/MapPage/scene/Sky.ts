import {
  BackSide, CircleGeometry, Color, DoubleSide, Group, Mesh, MeshBasicMaterial, RingGeometry, Scene, ShaderMaterial,
  SphereGeometry, CylinderGeometry, ConeGeometry, PerspectiveCamera,
} from 'three'
import { makeRng } from '../rng.mjs'

export type Sky = { update(dt: number, t: number, camera: PerspectiveCamera): void; tint(hex: string | null): void; dispose(): void }

const V = `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`
const F = `varying vec3 vP; uniform vec3 uTop, uMid, uLow;
void main(){
  float h = vP.y;
  vec3 c = mix(uLow, uMid, smoothstep(-.25, .12, h));
  c = mix(c, uTop, smoothstep(.1, .75, h));
  // flat poster bands instead of a smooth blend
  float band = floor(h * 7.) / 7.;
  c = mix(c, mix(uLow, uTop, clamp(band + .5, 0., 1.)), .35);
  gl_FragColor = vec4(c, 1.);
}`

/** A flat, sunny sky: banded gradient, a round sun, puffy clouds, two balloons. */
export function createSky(scene: Scene, { reduced }: { reduced: boolean }): Sky {
  const group = new Group()
  scene.add(group)
  const uni = { uTop: { value: new Color('#7fd0ff') }, uMid: { value: new Color('#c9f0ff') }, uLow: { value: new Color('#bfeeff') } }
  const wantTop = new Color('#7fd0ff')
  const wantMid = new Color('#c9f0ff')
  const wantLow = new Color('#bfeeff')
  const dome = new Mesh(new SphereGeometry(2600, 24, 12), new ShaderMaterial({ side: BackSide, depthWrite: false, fog: false, vertexShader: V, fragmentShader: F, uniforms: uni }))
  group.add(dome)

  const sun = new Group()
  sun.add(new Mesh(new CircleGeometry(60, 40), new MeshBasicMaterial({ color: '#fff3a8', fog: false })))
  const rays = new Mesh(new RingGeometry(78, 98, 12, 1), new MeshBasicMaterial({ color: '#fff3a8', transparent: true, opacity: 0.55, fog: false, side: DoubleSide }))
  sun.add(rays)
  sun.position.set(-900, 900, -1700)
  group.add(sun)

  const rng = makeRng(31)
  const white = new MeshBasicMaterial({ color: '#ffffff', fog: false })
  const shade = new MeshBasicMaterial({ color: '#e4f3ff', fog: false })
  const ball = new SphereGeometry(1, 14, 10)
  const clouds: { g: Group; v: number }[] = []
  for (let i = 0; i < 18; i++) {
    const g = new Group()
    const puffs = 3 + Math.floor(rng() * 3)
    for (let k = 0; k < puffs; k++) {
      const s = 22 + rng() * 26
      const under = new Mesh(ball, shade)
      under.scale.set(s, s * 0.7, s * 0.8)
      under.position.set((k - puffs / 2) * 30, -3, 0)
      const top = new Mesh(ball, white)
      top.scale.set(s, s * 0.7, s * 0.8)
      top.position.set((k - puffs / 2) * 30, 2, 0)
      g.add(under, top)
    }
    const a = rng() * Math.PI * 2
    const d = 520 + rng() * 700
    g.position.set(Math.cos(a) * d * 0.8, (i % 3 ? 120 + rng() * 260 : -140 - rng() * 120), Math.sin(a) * d * 0.8 + 140)
    g.scale.setScalar(0.9 + rng() * 1.4)
    clouds.push({ g, v: 3 + rng() * 5 })
    group.add(g)
  }

  const balloons: { g: Group; phase: number; base: number }[] = []
  const colours = [['#ff7aa8', '#ffe27a'], ['#5fe3b4', '#ffffff']]
  colours.forEach(([a, b], i) => {
    const g = new Group()
    const env = new Mesh(new SphereGeometry(16, 16, 12), new MeshBasicMaterial({ color: a, fog: false }))
    env.scale.y = 1.2
    const stripe = new Mesh(new SphereGeometry(16.4, 16, 12, 0, Math.PI / 2), new MeshBasicMaterial({ color: b, fog: false }))
    stripe.scale.y = 1.2
    const basket = new Mesh(new CylinderGeometry(4, 3.2, 5, 8), new MeshBasicMaterial({ color: '#c98b5a', fog: false }))
    basket.position.y = -26
    const cone = new Mesh(new ConeGeometry(6, 8, 10), new MeshBasicMaterial({ color: a, fog: false }))
    cone.position.y = -17
    cone.rotation.x = Math.PI
    g.add(env, stripe, cone, basket)
    g.position.set(i ? 330 : -380, 150 + i * 40, i ? 40 : 170)
    g.scale.setScalar(1.5)
    balloons.push({ g, phase: i * 2, base: g.position.y })
    group.add(g)
  })

  return {
    tint(hex) {
      if (!hex) {
        wantTop.set('#7fd0ff')
        wantMid.set('#c9f0ff')
        wantLow.set('#bfeeff')
        return
      }
      const c = new Color(hex)
      wantTop.set('#7fd0ff').lerp(c, 0.35)
      wantMid.set('#c9f0ff').lerp(c, 0.55)
      wantLow.set('#bfeeff').lerp(c, 0.55)
    },
    update(dt, t, camera) {
      const k = Math.min(1, dt * 2.5)
      uni.uTop.value.lerp(wantTop, k)
      uni.uMid.value.lerp(wantMid, k)
      uni.uLow.value.lerp(wantLow, k)
      dome.position.copy(camera.position)
      sun.position.copy(camera.position).add({ x: -900, y: 900, z: -1700 } as any)
      sun.lookAt(camera.position)
      if (reduced) return
      rays.rotation.z = t * 0.05
      for (const c of clouds) {
        c.g.position.x += c.v * dt
        if (c.g.position.x > 1250) c.g.position.x = -1250
      }
      for (const b of balloons) {
        b.g.position.y = b.base + Math.sin(t * 0.5 + b.phase) * 8
        b.g.rotation.z = Math.sin(t * 0.4 + b.phase) * 0.06
      }
    },
    dispose() {
      scene.remove(group)
      group.traverse((o) => {
        const m = o as Mesh
        m.geometry?.dispose?.()
        const mat = m.material as any
        if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((x) => x.dispose?.())
      })
    },
  }
}
