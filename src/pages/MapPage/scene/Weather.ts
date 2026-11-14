import {
  AdditiveBlending, BufferAttribute, BufferGeometry, CatmullRomCurve3, Color, DoubleSide, Group, InstancedMesh, Mesh, Object3D,
  PlaneGeometry, Points, ShaderMaterial, Vector3,
} from 'three'
import { makeRng } from '../rng.mjs'

/** Viewport height in device pixels: World keeps it fresh so point sprites keep their size. */
export const viewH = { value: 800 }
type U = { value: number }
export type Kind = 'sun' | 'wind' | 'rain' | 'snow' | 'petals' | 'volcano' | 'crater' | 'geyser'
export type Weather = { group: Group; update(dt: number, t: number): void; dispose(): void }

/** Region weather: what drifts over each island besides the waves and waterfalls they all have. */
export const WEATHER: Record<string, Kind[]> = {
  kanto: ['sun'],
  johto: ['wind'],
  hoenn: ['volcano', 'sun'],
  sinnoh: ['snow'],
  unova: ['rain'],
  kalos: ['petals'],
  alola: ['sun', 'geyser'],
  galar: ['rain', 'wind'],
  paldea: ['crater'],
}

const POINT_V = `
  uniform float uTime; uniform float uAmt; uniform float uVH; uniform float uK;
  attribute float aP; attribute float aS; attribute vec3 aV; attribute vec3 aC;
  varying vec3 vC; varying float vA;
  float px(float world, float z){ return world * uK * projectionMatrix[1][1] * uVH * 0.5 / max(z, 1.); }
`
const POINT_F = `varying vec3 vC; varying float vA;
  void main(){ vec2 q = gl_PointCoord - .5; float d = length(q); if (d > .5) discard;
    gl_FragColor = vec4(mix(vC, vec3(1.), smoothstep(.3, .5, d) * .25), vA); }`

function cloud(name: string, N: number, fill: (i: number, r: () => number, set: (k: 'pos' | 'v' | 'c', a: number[]) => void) => number, vert: string, uni: Record<string, { value: any }>, seed: number, blend = false) {
  const r = makeRng(seed)
  const pos = new Float32Array(N * 3)
  const vel = new Float32Array(N * 3)
  const col = new Float32Array(N * 3)
  const ph = new Float32Array(N)
  const sz = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    sz[i] = fill(i, r, (k, a) => (k === 'pos' ? pos : k === 'v' ? vel : col).set(a, i * 3))
    ph[i] = r()
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(pos, 3))
  g.setAttribute('aV', new BufferAttribute(vel, 3))
  g.setAttribute('aC', new BufferAttribute(col, 3))
  g.setAttribute('aP', new BufferAttribute(ph, 1))
  g.setAttribute('aS', new BufferAttribute(sz, 1))
  const m = new ShaderMaterial({
    transparent: true, depthWrite: false, blending: blend ? AdditiveBlending : 1,
    uniforms: { uVH: viewH, ...uni }, vertexShader: POINT_V + vert, fragmentShader: POINT_F,
  })
  const p = new Points(g, m)
  p.frustumCulled = false
  p.name = name
  return p
}
const rgb = (hex: string) => {
  const c = new Color(hex)
  return [c.r, c.g, c.b]
}

/**
 * A jet of droplets: a geyser, a fountain or the mist at a waterfall's foot.
 * Stateless: every drop's place comes from the clock, so it costs one draw call.
 */
export function jets(parent: Object3D, time: U, amt: U, o: { at: Vector3; count?: number; height: number; spread?: number; size?: number; colour?: string; life?: number; k?: U; seed?: number; mist?: boolean }) {
  const life = o.life ?? 1.7
  const colour = rgb(o.colour ?? '#bfeaff')
  const p = cloud('jet', o.count ?? 36, (i, r, set) => {
    const a = r() * Math.PI * 2
    const s = (o.spread ?? 0.3) * (0.3 + r())
    set('pos', [o.at.x, o.at.y, o.at.z])
    set('v', [Math.cos(a) * s, (o.mist ? 0.25 : 0.7) + r() * 0.5, Math.sin(a) * s])
    set('c', colour)
    return (o.size ?? 2) * (0.6 + r() * 0.8)
  }, `
    uniform float uH; uniform float uLife; uniform float uMist;
    void main(){
      float t = fract(uTime / uLife + aP) * uLife;
      float k = t / uLife;
      vec3 p = position;
      p.xz += aV.xz * t * uH * .5;
      p.y += uH * (aV.y * t - aV.y / uLife * t * t * (1. - uMist * .8)) + uMist * t * 3.;
      vC = mix(vec3(1.), aC, k);
      vA = (1. - pow(k, 4.)) * uAmt * (1. - uMist * .45);
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      gl_PointSize = clamp(px(aS * (1. + uMist * k * 2.2) * (1. - .5 * k), -mv.z), 2., 70.);
      gl_Position = projectionMatrix * mv; }`,
  { uTime: time, uAmt: amt, uH: { value: o.height }, uLife: { value: life }, uMist: { value: o.mist ? 1 : 0 }, uK: o.k ?? { value: 1 } }, o.seed ?? 5)
  parent.add(p)
  return p
}

const MATS: ShaderMaterial[] = []
const mk = (m: ShaderMaterial) => (MATS.push(m), m)

export function createWeather(kinds: Kind[], ctx: { T: number; time: U; amt: U; k: U; kl: U; lm: Group; seed: number }): Weather {
  const group = new Group()
  const { T, time, amt } = ctx
  const owned: { dispose(): void }[] = []
  const track = <X extends { dispose(): void }>(x: X) => (owned.push(x), x)
  const live: ((dt: number, t: number) => void)[] = []
  const rng = makeRng(ctx.seed)

  for (const kind of kinds) {
    if (kind === 'rain') {
      const N = 520
      const H = 190
      const geo = track(new PlaneGeometry(0.55, 8))
      const m = track(
        new ShaderMaterial({
          transparent: true, depthWrite: false, side: DoubleSide, uniforms: { uTime: time, uAmt: amt, uH: { value: H } },
          vertexShader: `uniform float uTime; uniform float uH; varying float vA;
          void main(){
            vec3 base = instanceMatrix[3].xyz;
            float spd = 90. + fract(sin(base.x * 12.9 + base.z * 7.1) * 4375.5) * 60.;
            float y = mod(base.y - uTime * spd, uH);
            vec3 p = vec3(base.x + y * .08, y, base.z) + mat3(instanceMatrix) * position;
            vA = smoothstep(0., 18., y) * .6;
            gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.); }`,
          fragmentShader: `uniform float uAmt; varying float vA; void main(){ gl_FragColor = vec4(.78, .9, 1., vA * uAmt); }`,
        })
      )
      const rain = new InstancedMesh(geo, m, N)
      const d = new Object3D()
      for (let i = 0; i < N; i++) {
        const a = rng() * 6.283
        const r = Math.sqrt(rng()) * T * 1.05
        d.position.set(Math.cos(a) * r, rng() * H, Math.sin(a) * r)
        d.rotation.set(0, rng() * 3, -0.08)
        d.updateMatrix()
        rain.setMatrixAt(i, d.matrix)
      }
      rain.frustumCulled = false
      group.add(rain)
      // a grey cloud bank overhead, and a flash now and then
      const flash = new Mesh(track(new PlaneGeometry(22, 120)), track(new ShaderMaterial({ transparent: true, depthWrite: false, side: DoubleSide, uniforms: { uF: { value: 0 }, uAmt: amt }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }', fragmentShader: 'varying vec2 vUv; uniform float uF; uniform float uAmt; void main(){ float x = abs(vUv.x - .5 + sin(vUv.y * 14.) * .16 * (1. - vUv.y * .4)); float bolt = smoothstep(.07, .0, x) * smoothstep(0., .06, vUv.y); gl_FragColor = vec4(1., .95, .55, bolt * uF * uAmt); }' })))
      flash.position.set(T * 0.2, H * 0.4, -T * 0.3)
      flash.rotation.y = 0.5
      group.add(flash)
      const fm = flash.material as ShaderMaterial
      let next = 3
      live.push((dt, t) => {
        if (t > next) {
          fm.uniforms.uF.value = 1
          next = t + 5 + rng() * 6
        }
        fm.uniforms.uF.value = Math.max(0, fm.uniforms.uF.value - dt * 4.5)
      })
    } else if (kind === 'snow') {
      const N = 360
      const H = 170
      group.add(
        cloud('snow', N, (i, r, set) => {
          const a = r() * 6.283
          const d = Math.sqrt(r()) * T * 1.05
          set('pos', [Math.cos(a) * d, r() * H, Math.sin(a) * d])
          set('c', [1, 1, 1])
          return 1.4 + r() * 1.8
        }, `uniform float uH;
        void main(){
          float y = mod(position.y - uTime * (9. + aS * 5.), uH);
          vec3 p = vec3(position.x + sin(uTime * .6 + aP * 20.) * 8., y, position.z + cos(uTime * .5 + aP * 17.) * 8.);
          vC = aC; vA = smoothstep(0., 14., y) * smoothstep(uH, uH - 20., y) * uAmt;
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          gl_PointSize = clamp(px(aS * 2.2, -mv.z), 2., 26.);
          gl_Position = projectionMatrix * mv; }`, { uTime: time, uAmt: amt, uH: { value: H }, uK: ctx.k }, ctx.seed + 3)
      )
    } else if (kind === 'petals') {
      const cols = ['#ff7aa8', '#ffd24a', '#5fe3b4', '#7ac8ff', '#c79bff', '#ff9a4a'].map(rgb)
      group.add(
        cloud('petals', 70, (i, r, set) => {
          const a = r() * 6.283
          const d = Math.sqrt(r()) * T * 1.0
          set('pos', [Math.cos(a) * d, 8 + r() * 90, Math.sin(a) * d])
          set('c', cols[i % cols.length])
          return 2 + r() * 2.4
        }, `uniform float uH;
        void main(){
          vec3 p = position;
          p.x = mod(p.x + uTime * 7. + sin(uTime * .5 + aP * 9.) * 18. + uH, uH * 2.) - uH;
          p.y += sin(uTime * .9 + aP * 12.) * 7.;
          p.z += cos(uTime * .6 + aP * 5.) * 14.;
          vC = aC; vA = (.45 + .3 * sin(uTime * 2. + aP * 6.)) * uAmt;
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          gl_PointSize = clamp(px(aS * 1.1, -mv.z), 2., 11.);
          gl_Position = projectionMatrix * mv; }`, { uTime: time, uAmt: amt, uH: { value: T }, uK: ctx.k }, ctx.seed + 5)
      )
    } else if (kind === 'wind') {
      // leaves tumbling across, and long curling gusts
      const cols = ['#7be08a', '#c8e85a', '#ffc04a', '#ff8a5a', '#5fd0a0'].map(rgb)
      group.add(
        cloud('leaves', 60, (i, r, set) => {
          set('pos', [(r() * 2 - 1) * T, 12 + r() * 70, (r() * 2 - 1) * T * 0.9])
          set('c', cols[i % cols.length])
          return 2.4 + r() * 2
        }, `uniform float uH;
        void main(){
          vec3 p = position;
          p.x = mod(p.x + uTime * (26. + aS * 6.) + uH, uH * 2.) - uH;
          p.y += sin(uTime * 2.1 + aP * 20.) * 5. + sin(p.x * .03) * 8.;
          p.z += cos(uTime * 1.6 + aP * 13.) * 12.;
          vC = aC; vA = smoothstep(uH, uH * .8, abs(p.x)) * uAmt;
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          gl_PointSize = clamp(px(aS * 1.1, -mv.z), 2., 12.);
          gl_Position = projectionMatrix * mv; }`, { uTime: time, uAmt: amt, uH: { value: T }, uK: ctx.k }, ctx.seed + 7)
      )
      for (let g = 0; g < 7; g++) {
        const y = 20 + rng() * 80
        const z0 = (rng() * 2 - 1) * T * 0.8
        const ph = rng() * 6
        const curve = new CatmullRomCurve3(Array.from({ length: 22 }, (_, i) => {
          const u = i / 21
          const x = (u * 2 - 1) * T * 0.95
          return new Vector3(x, y + Math.sin(u * 9 + ph) * 6 + Math.sin(u * 3) * 10, z0 + Math.cos(u * 7 + ph) * 14)
        }))
        const P: number[] = []
        const UV: number[] = []
        const I: number[] = []
        for (let i = 0; i <= 60; i++) {
          const u = i / 60
          const pt = curve.getPoint(u)
          const w = 0.9 * Math.sin(u * Math.PI)
          P.push(pt.x, pt.y - w, pt.z, pt.x, pt.y + w, pt.z)
          UV.push(u, 0, u, 1)
          if (i < 60) I.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2)
        }
        const bg = track(new BufferGeometry())
        bg.setAttribute('position', new BufferAttribute(new Float32Array(P), 3))
        bg.setAttribute('uv', new BufferAttribute(new Float32Array(UV), 2))
        bg.setIndex(I)
        const m = track(mk(new ShaderMaterial({
          transparent: true, depthWrite: false, side: DoubleSide, uniforms: { uTime: time, uAmt: amt, uPh: { value: ph } },
          vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
          fragmentShader: 'varying vec2 vUv; uniform float uTime; uniform float uAmt; uniform float uPh; void main(){ float d = fract(vUv.x * 2. - uTime * .22 - uPh); float a = smoothstep(0., .08, d) * smoothstep(.5, .12, d); gl_FragColor = vec4(1., 1., 1., a * .75 * uAmt); }',
        })))
        const mesh = new Mesh(bg, m)
        mesh.frustumCulled = false
        group.add(mesh)
      }
    } else if (kind === 'sun') {
      // slanted shafts of light, and glints on the water
      for (let i = 0; i < 6; i++) {
        const m = track(new ShaderMaterial({
          transparent: true, depthWrite: false, side: DoubleSide, blending: AdditiveBlending,
          uniforms: { uTime: time, uAmt: amt, uPh: { value: rng() * 6 } },
          vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
          fragmentShader: 'varying vec2 vUv; uniform float uTime; uniform float uAmt; uniform float uPh; void main(){ float soft = smoothstep(0., .3, vUv.x) * smoothstep(1., .7, vUv.x); float a = pow(vUv.y, 1.3) * soft * (.6 + .4 * sin(uTime * .7 + uPh)); gl_FragColor = vec4(1., .93, .6, a * .22 * uAmt); }',
        }))
        const mesh = new Mesh(track(new PlaneGeometry(26 + rng() * 26, 320)), m)
        mesh.position.set((rng() * 2 - 1) * T * 0.6 - T * 0.2, 150, (rng() * 2 - 1) * T * 0.4 - T * 0.25)
        mesh.rotation.set(0.22, 0.4, -0.38)
        group.add(mesh)
      }
      group.add(
        cloud('glint', 90, (i, r, set) => {
          const a = r() * 6.283
          const d = T * (0.75 + r() * 0.22)
          set('pos', [Math.cos(a) * d, 1.3, Math.sin(a) * d])
          set('c', [1, 1, 1])
          return 2.6 + r() * 2
        }, `void main(){
          vC = aC; vA = pow(max(0., sin(uTime * 2.2 + aP * 40.)), 6.) * uAmt;
          vec4 mv = modelViewMatrix * vec4(position, 1.);
          gl_PointSize = clamp(px(aS * 3., -mv.z), 2., 40.);
          gl_Position = projectionMatrix * mv; }`, { uTime: time, uAmt: amt, uK: ctx.k }, ctx.seed + 9, true)
      )
    } else if (kind === 'volcano' || kind === 'crater') {
      const top = kind === 'volcano' ? 23.6 : 3.9
      const lava = rgb('#ff6a2a')
      const ember = rgb('#ffd24a')
      const eruption = (count: number, big: boolean) => {
        const p = cloud('lava', count, (i, r, set) => {
          const a = r() * 6.283
          const s = 0.25 + r() * 0.5
          set('pos', [0, top, 0])
          set('v', [Math.cos(a) * s, (big ? 1.1 : 0.8) + r() * 0.6, Math.sin(a) * s])
          set('c', i % 3 ? lava : ember)
          return 1.6 + r() * 1.8
        }, `uniform float uH;
        void main(){
          float cyc = 4.4;
          float t0 = mod(uTime + aP * 1.4, cyc);
          float life = 2.6;
          float t = t0 - aP * 0.9;
          if (t < 0. || t > life) { gl_Position = vec4(2., 2., 2., 1.); gl_PointSize = 0.; vA = 0.; return; }
          float k = t / life;
          vec3 p = position + vec3(aV.x * t * uH * .55, uH * (aV.y * t - aV.y / life * t * t), aV.z * t * uH * .55);
          vC = mix(aC, vec3(.35, .22, .25), smoothstep(.55, 1., k));
          vA = (1. - pow(k, 5.)) * uAmt;
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          gl_PointSize = clamp(px(aS * .8 * (1. - .4 * k), -mv.z), 2., 22.);
          gl_Position = projectionMatrix * mv; }`, { uTime: time, uAmt: amt, uH: { value: big ? 34 : 24 }, uK: ctx.kl }, ctx.seed + 11)
        ctx.lm.add(p)
      }
      eruption(kind === 'volcano' ? 70 : 46, kind === 'volcano')
      // smoke rolling up and thinning out
      const smoke = cloud('smoke', 22, (i, r, set) => {
        set('pos', [(r() - 0.5) * 3, top, (r() - 0.5) * 3])
        set('v', [(r() - 0.3) * 0.9, 1, (r() - 0.5) * 0.9])
        set('c', rgb(i % 2 ? '#8e7f97' : '#b9aec2'))
        return 5 + r() * 4
      }, `void main(){
        float L = 6.;
        float t = fract(uTime / L + aP) * L;
        float k = t / L;
        vec3 p = position + vec3(aV.x * t * 2.6, t * 5., aV.z * t * 2.6);
        vC = mix(aC, vec3(1.), k * .3);
        vA = smoothstep(0., .12, k) * (1. - k) * .4 * uAmt;
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_PointSize = clamp(px(aS * (1. + k * 2.4), -mv.z), 4., 120.);
        gl_Position = projectionMatrix * mv; }`, { uTime: time, uAmt: amt, uK: ctx.kl }, ctx.seed + 13)
      ctx.lm.add(smoke)
      // a molten glow breathing in the mouth
      const glow = new Mesh(track(new PlaneGeometry(1, 1)), track(new ShaderMaterial({
        transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, uniforms: { uTime: time, uAmt: amt },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
        fragmentShader: 'varying vec2 vUv; uniform float uTime; uniform float uAmt; void main(){ float d = length(vUv - .5) * 2.; float a = smoothstep(1., 0., d); gl_FragColor = vec4(1., .55, .2, a * a * (.55 + .35 * sin(uTime * 3.)) * uAmt); }',
      })))
      glow.rotation.x = -Math.PI / 2
      glow.scale.set(kind === 'volcano' ? 15 : 22, kind === 'volcano' ? 15 : 22, 1)
      glow.position.y = top + 0.4
      ctx.lm.add(glow)
    } else if (kind === 'geyser') {
      // handled where the sea habitats are (Island.ts asks for bigger jets)
    }
  }

  return {
    group,
    update(dt, t) {
      for (const f of live) f(dt, t)
    },
    dispose() {
      group.removeFromParent()
      for (const d of owned) d.dispose()
      group.traverse((o) => {
        const m = o as Mesh
        m.geometry?.dispose?.()
        ;(m.material as any)?.dispose?.()
      })
    },
  }
}
