import {
  BoxGeometry, BufferAttribute, BufferGeometry, CatmullRomCurve3, CircleGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide,
  Group, IcosahedronGeometry, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, OctahedronGeometry, PlaneGeometry, RingGeometry, ShaderMaterial,
  SphereGeometry, Sprite, SpriteMaterial, TorusGeometry, Vector3,
} from 'three'
import { REGION_R, TRAY, terrainSeed } from '../layout.mjs'
import { hashSeed, makeRng } from '../rng.mjs'
import { FLOOR, coastRadius, heightAt, isLand, zoneAt } from '../terrain.mjs'
import { TYPE_DATA } from '../../../components/pokemon-page/type-data.mjs'
import { GYMS } from '../data/gyms.mjs'
import { CANDY, pillTexture, toon } from './flat'
import { createWeather, jets, WEATHER } from './Weather'

type Region = { id: string; name: string; palette: { grass: string; rock: string; water: string; glow: string; sky: string } }
type Town = { id: string; name: string; gym?: string; x: number; z: number }
type Zone = { id: string; kind: string; x: number; z: number; r: number }
type Layout = { towns: Town[]; zones: Zone[]; routes: { from: string; to: string }[]; landmark: { kind: string; x: number; z: number } }
export type ZoneInfo = { x: number; y: number; z: number; r: number; kind: string }

export type Island = {
  regionId: string
  /** moved and scaled by the world (sky size ↔ full size) */
  root: Group
  /** squashes and bounces on hover */
  inner: Group
  hit: Object3D[]
  label: Sprite
  labelRatio: number
  lmScale: number
  zones: Record<string, ZoneInfo>
  towns: { id: string; name: string; gym?: string; x: number; y: number; z: number }[]
  groundAt(x: number, z: number): number
  isLand(x: number, z: number): boolean
  keepOnLand(x: number, z: number, water?: boolean): { x: number; z: number }
  top(): Vector3
  setHover(on: boolean): void
  shake(zoneId: string): void
  update(dt: number, t: number, focus: number): void
  dispose(): void
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const mixC = (a: string | Color, b: string | Color, u: number) => new Color(a).lerp(new Color(b), Math.min(1, Math.max(0, u)))
const SEG = 180
const RINGS = 64
/** every prop was drawn for a 96-wide land; the land is now twice as wide */
const K = 1.9

export function createIsland(region: Region, layout: Layout): Island {
  const R = REGION_R
  const T = R * TRAY
  const seed = terrainSeed(region.id)
  const rng = makeRng(hashSeed(region.id, 'decor'))
  const pal = {
    grass: new Color(region.palette.grass),
    rock: new Color(region.palette.rock),
    water: new Color(region.palette.water),
    accent: new Color(region.palette.glow),
    sky: new Color(region.palette.sky),
  }
  const owned: { dispose(): void }[] = []
  const track = <X extends { dispose(): void }>(x: X) => (owned.push(x), x)
  const geo = {
    box: track(new BoxGeometry(1, 1, 1)),
    cone: track(new ConeGeometry(1, 1, 7)),
    cone4: track(new ConeGeometry(1, 1, 4)),
    cyl: track(new CylinderGeometry(1, 1, 1, 12)),
    disc: track(new CylinderGeometry(1, 1, 1, 40)),
    ball: track(new SphereGeometry(1, 12, 9)),
    ico: track(new IcosahedronGeometry(1, 0)),
  }
  const mat = (c: string | Color) => track(toon(c))
  const root = new Group()
  const inner = new Group()
  root.add(inner)
  const decor = new Group()
  inner.add(decor)
  const timeU = { value: 0 }
  const kU = { value: 1 }
  const klU = { value: 1 }
  const amtU = { value: 0 }
  const hit: Object3D[] = []
  const bobbers: { m: Object3D; y: number; s: number; a?: number; r?: number; cx?: number; cz?: number }[] = []

  const groundAt = (x: number, z: number) => {
    const h = heightAt(seed, x, z, R)
    return h <= 0 ? 0 : Math.max(0.2, h)
  }
  const put = (g: Mesh, x: number, y: number, z: number, sx = 1, sy = sx, sz = sx, parent: Object3D = decor) => {
    g.position.set(x, y, z)
    g.scale.set(sx, sy, sz)
    parent.add(g)
    return g
  }
  const part = (kind: keyof typeof geo, colour: string | Color, x: number, y: number, z: number, sx: number, sy = sx, sz = sx, parent: Object3D = decor) =>
    put(new Mesh(geo[kind], mat(colour)), x, y, z, sx, sy, sz, parent)

  // ---- the sea tray: a toy diorama base with a white rim
  const water = track(
    new ShaderMaterial({
      uniforms: { uTime: timeU, uA: { value: pal.water.clone() }, uB: { value: mixC(pal.water, '#ffffff', 0.38) } },
      vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `varying vec2 vP; uniform float uTime; uniform vec3 uA; uniform vec3 uB;
      void main(){
        float d = length(vP);
        float a = atan(vP.y, vP.x);
        float w = fract(d * .045 + sin(a * 5. + uTime * .6) * .03 - uTime * .06);
        float line = step(.9, w);
        gl_FragColor = vec4(mix(uA, uB, line * .7), 1.);
      }`,
    })
  )
  const sea = track(new CircleGeometry(T, 72))
  const seaMesh = new Mesh(sea, water)
  seaMesh.rotation.x = -Math.PI / 2
  seaMesh.position.y = -0.2
  seaMesh.userData = { kind: 'island', id: region.id }
  inner.add(seaMesh)
  hit.push(seaMesh)
  const rim = new Mesh(track(new CylinderGeometry(T, T * 0.97, 7, 72)), mat('#fff7e6'))
  rim.position.y = -3.9
  inner.add(rim)
  rim.userData = { kind: 'island', id: region.id }
  hit.push(rim)
  const border = new Mesh(track(new RingGeometry(T - 1.2, T + 2.6, 72)), track(new MeshBasicMaterial({ color: '#ffffff', side: DoubleSide })))
  border.rotation.x = -Math.PI / 2
  border.position.y = 0.4
  inner.add(border)

  // ---- the rock below: a faceted inverted mass in strata, hung with stalactites
  {
    const SU = 84
    const RU = 18
    const depth = T * 1.18
    const nz = (a: number, s: number, k: number) => Math.sin(a * 3 + k + s * 4) * 0.5 + Math.sin(a * 7 - k * 2 + s * 9) * 0.3 + Math.sin(a * 13 + s * 17 + k) * 0.2
    const up = new Float32Array((RU + 1) * SU * 3)
    for (let i = 0; i <= RU; i++)
      for (let j = 0; j < SU; j++) {
        const a = (j / SU) * Math.PI * 2
        const s = i / RU
        const r = T * 0.97 * Math.pow(1 - s, 0.78) * (1 + 0.1 * nz(a, s, 1.7) * Math.sin(Math.min(1, s * 3) * Math.PI * 0.5))
        const y = -7 - depth * Math.pow(s, 0.85) + nz(a, s, 4.1) * 7 * s
        up.set([Math.cos(a) * r, y, Math.sin(a) * r], (i * SU + j) * 3)
      }
    const ui: number[] = []
    for (let i = 0; i < RU; i++)
      for (let j = 0; j < SU; j++) {
        const a = i * SU + j
        const b = i * SU + ((j + 1) % SU)
        const c = (i + 1) * SU + j
        const d = (i + 1) * SU + ((j + 1) % SU)
        ui.push(a, c, b, b, c, d)
      }
    let ug: BufferGeometry = new BufferGeometry()
    ug.setAttribute('position', new BufferAttribute(up, 3))
    ug.setIndex(ui)
    ug = ug.toNonIndexed()
    const upos = ug.getAttribute('position')
    const uc = new Float32Array(upos.count * 3)
    const strata = [mixC(pal.rock, '#ffffff', 0.2), pal.rock.clone(), mixC(pal.rock, '#8a5a3a', 0.45), mixC(pal.rock, '#5a4668', 0.35), mixC(pal.rock, '#c98b5a', 0.4)]
    for (let k = 0; k < upos.count / 3; k++) {
      const cy = (upos.getY(k * 3) + upos.getY(k * 3 + 1) + upos.getY(k * 3 + 2)) / 3
      const s = Math.min(1, Math.max(0, (-7 - cy) / depth))
      const band = Math.floor(s * 9 + nz(k * 0.37, s, 2) * 0.9)
      const c = s < 0.07 ? new Color('#8a5a3a') : strata[((band % 5) + 5) % 5].clone().offsetHSL(0, 0, (k % 3) * 0.018 - s * 0.1)
      for (let v = 0; v < 3; v++) uc.set([c.r, c.g, c.b], (k * 3 + v) * 3)
    }
    ug.setAttribute('color', new BufferAttribute(uc, 3))
    ug.computeVertexNormals()
    const under = new Mesh(track(ug), track(toon('#ffffff', { vertexColors: true })))
    under.userData = { kind: 'island', id: region.id }
    inner.add(under)
    hit.push(under)
    for (let i = 0; i < 16; i++) {
      const a = rng() * Math.PI * 2
      const s = 0.12 + rng() * 0.5
      const r = T * 0.9 * Math.pow(1 - s, 0.78)
      const h = 24 + rng() * 55
      const w = 8 + rng() * 11
      const c = part('cone', i % 3 ? pal.rock : mixC(pal.rock, '#5a4668', 0.4), Math.cos(a) * r * 0.92, -7 - depth * Math.pow(s, 0.85) - h * 0.32, Math.sin(a) * r * 0.92, w, h, w)
      c.rotation.x = Math.PI
      c.rotation.y = rng() * 3
    }
    for (let i = 0; i < 9; i++) {
      const a = rng() * Math.PI * 2
      const r = T * (0.35 + rng() * 0.8)
      const sz = 8 + rng() * 14
      const rock = part('ico', i % 2 ? pal.rock : '#b8764a', Math.cos(a) * r, -T * (0.55 + rng() * 0.8), Math.sin(a) * r, sz, sz * 0.85, sz)
      rock.rotation.set(rng(), rng() * 3, 0)
      bobbers.push({ m: rock, y: rock.position.y, s: rng() * 6, a: rng() * 6, r: 3, cx: rock.position.x, cz: rock.position.z })
    }
    // waterfalls pouring off the rim, thinning into mist
    const nWf = 3
    const wa = rng() * 6
    for (let i = 0; i < nWf; i++) {
      const a = wa + (i / nWf) * Math.PI * 2 + (rng() - 0.5) * 0.5
      const g = new Group()
      g.position.set(Math.cos(a) * T * 0.992, -5, Math.sin(a) * T * 0.992)
      g.rotation.y = -a + Math.PI / 2
      const H = depth * 0.95
      const wg = track(new PlaneGeometry(20, H, 1, 14))
      wg.translate(0, -H / 2, 0)
      const wm = track(
        new ShaderMaterial({
          transparent: true, depthWrite: false, side: DoubleSide, uniforms: { uTime: timeU, uA: { value: mixC(pal.water, '#ffffff', 0.4) }, uPh: { value: rng() * 6 } },
          vertexShader: `varying vec2 vUv; uniform float uTime; uniform float uPh;
          void main(){ vUv = uv; vec3 p = position; float k = 1. - uv.y;
            p.x *= 1. - .55 * k; p.z += sin(uTime * 1.3 + k * 6. + uPh) * 1.4 * k * k;
            gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
          fragmentShader: `varying vec2 vUv; uniform float uTime; uniform vec3 uA; uniform float uPh;
          void main(){
            float k = 1. - vUv.y;
            float streak = .55 + .45 * sin(vUv.x * 46. + sin(vUv.y * 9. - uTime * 2.) * 2.);
            float flow = fract(vUv.y * 5. - uTime * 1.4 + vUv.x * 2. + uPh);
            float a = smoothstep(.0, .12, vUv.y) * pow(vUv.y, .9) * (1. - smoothstep(.0, .9, k));
            float edge = smoothstep(0., .22, vUv.x) * smoothstep(1., .78, vUv.x);
            gl_FragColor = vec4(mix(uA, vec3(1.), flow * .7 * streak), (1. - pow(k, 2.2)) * edge * (.55 + .4 * streak) * (1. - smoothstep(.7, 1., k)));
          }`,
        })
      )
      g.add(new Mesh(wg, wm))
      inner.add(g)
      jets(inner, timeU, { value: 1 }, { at: new Vector3(Math.cos(a) * T * 0.99, -5 - H, Math.sin(a) * T * 0.99), count: 26, height: 14, spread: 0.9, size: 9, life: 2.6, mist: true, colour: '#ffffff', k: kU, seed: 40 + i })
    }
  }

  // ---- the land: a polar mesh with paper-cut colour tiers
  const rows = RINGS + 2
  const pos = new Float32Array(rows * SEG * 3)
  const cr = Array.from({ length: SEG }, (_, j) => coastRadius(seed, Math.atan2(Math.sin((j / SEG) * Math.PI * 2), Math.cos((j / SEG) * Math.PI * 2)), R))
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < SEG; j++) {
      const a = (j / SEG) * Math.PI * 2
      const t = Math.min(1, i / RINGS)
      const r = t * cr[j]
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      const y = i > RINGS ? -4 : i === RINGS ? Math.min(-0.5, heightAt(seed, x, z, R)) : Math.max(-3, heightAt(seed, x, z, R))
      pos.set([x, y, z], (i * SEG + j) * 3)
    }
  const index: number[] = []
  for (let i = 0; i < rows - 1; i++)
    for (let j = 0; j < SEG; j++) {
      const a = i * SEG + j
      const b = i * SEG + ((j + 1) % SEG)
      const c = (i + 1) * SEG + j
      const d = (i + 1) * SEG + ((j + 1) % SEG)
      index.push(a, b, c, b, d, c)
    }
  let g: BufferGeometry = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(pos, 3))
  g.setIndex(index)
  g = g.toNonIndexed()
  const p = g.getAttribute('position')
  const colours = new Float32Array(p.count * 3)
  const sand = new Color('#f8e6ae')
  const g1 = mixC(pal.grass, '#ffffff', 0.12)
  const g2 = pal.grass.clone()
  const g3 = mixC(pal.grass, '#1b6b4a', 0.28)
  const snow = new Color('#ffffff')
  const soil = new Color('#c98b5a')
  for (let k = 0; k < p.count / 3; k++) {
    let cx = 0, cy = 0, cz = 0
    for (let v = 0; v < 3; v++) {
      cx += p.getX(k * 3 + v) / 3
      cy += p.getY(k * 3 + v) / 3
      cz += p.getZ(k * 3 + v) / 3
    }
    let c: Color
    if (cy < -0.4) c = soil
    else {
      const e = Math.hypot(cx, cz) / coastRadius(seed, Math.atan2(cz, cx), R)
      c = e > 0.9 || cy < 0.9 ? sand : cy < 4.7 ? g1 : cy < 8.3 ? g2 : cy < 11.2 ? g3 : g3
      const zid = zoneAt(layout, cx, cz)
      const zone = zid ? layout.zones.find((z) => z.id === zid) : null
      if (zone && c !== sand) {
        if (zone.kind === 'mountain') c = mixC(pal.rock, '#ffffff', 0.15)
        else if (zone.kind === 'cave') c = mixC(pal.rock, '#7a6a90', 0.4)
        else if (zone.kind === 'grass') c = mixC(pal.grass, '#3fd079', 0.45)
        else if (zone.kind === 'route') c = mixC(sand, pal.grass, 0.25)
      }
    }
    for (let v = 0; v < 3; v++) colours.set([c.r, c.g, c.b], (k * 3 + v) * 3)
  }
  g.setAttribute('color', new BufferAttribute(colours, 3))
  g.computeVertexNormals()
  const land = new Mesh(track(g), track(toon('#ffffff', { vertexColors: true })))
  land.userData = { kind: 'island', id: region.id }
  inner.add(land)
  hit.push(land)

  // wave foam hugging the coast
  const foamPos: number[] = []
  const foamUv: number[] = []
  const foamIdx: number[] = []
  for (let j = 0; j <= SEG; j++) {
    const a = ((j % SEG) / SEG) * Math.PI * 2
    const c = cr[j % SEG]
    for (const [k, s] of [[0, 0.99], [1, 1.22]] as const) {
      foamPos.push(Math.cos(a) * c * s, 0.12, Math.sin(a) * c * s)
      foamUv.push(j / SEG, k)
    }
    if (j < SEG) foamIdx.push(j * 2, j * 2 + 1, j * 2 + 2, j * 2 + 1, j * 2 + 3, j * 2 + 2)
  }
  const foamGeo = track(new BufferGeometry())
  foamGeo.setAttribute('position', new BufferAttribute(new Float32Array(foamPos), 3))
  foamGeo.setAttribute('uv', new BufferAttribute(new Float32Array(foamUv), 2))
  foamGeo.setIndex(foamIdx)
  const foam = new Mesh(
    foamGeo,
    track(
      new ShaderMaterial({
        transparent: true, depthWrite: false, side: DoubleSide, uniforms: { uTime: timeU },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
        fragmentShader: `varying vec2 vUv; uniform float uTime;
        void main(){
          float a = vUv.x * 6.2832;
          float out_ = 0.;
          for (int w = 0; w < 3; w++) {
            float ph = fract(uTime * .2 + float(w) / 3. + sin(a * 5. + uTime * .5 + float(w)) * .03);
            float pos = 1. - ph;
            float crest = smoothstep(.1, .0, abs(vUv.y - pos) - .02 * (1. - ph));
            float curl = smoothstep(.0, .12, vUv.y - pos + .06) * smoothstep(.2, .0, vUv.y - pos) * .5;
            out_ = max(out_, (crest + curl) * (1. - ph * .85));
          }
          float shore = smoothstep(.2, .0, vUv.y) * (.7 + .3 * sin(a * 40. + uTime * 2.));
          gl_FragColor = vec4(1., 1., 1., clamp(out_ + shore, 0., 1.) * .9);
        }`,
      })
    )
  )
  decor.add(foam)

  // ---- habitats
  const kinds = WEATHER[region.id] ?? []
  const geyser = kinds.includes('geyser')
  const zones: Record<string, ZoneInfo> = {}
  const shakers: Record<string, { value: number }> = {}
  const spinners: Object3D[] = []
  const flags: Object3D[] = []
  const birds: { g: Group; a: number; r: number; h: number; sp: number; wings: Mesh[] }[] = []
  // a few flat paper birds circling the island
  const birdMat = mat('#ffffff')
  const wingGeo = track(new BoxGeometry(7, 0.5, 2.2))
  for (let i = 0; i < 4; i++) {
    const g = new Group()
    const body = new Mesh(track(new SphereGeometry(1.6, 8, 6)), mat(CANDY[(i * 2) % CANDY.length]))
    body.scale.set(1.5, 0.8, 0.9)
    g.add(body)
    const wings = [-1, 1].map((s) => {
      const w = new Mesh(wingGeo, birdMat)
      w.position.set(0, 0.2, s * 3.4)
      w.rotation.y = Math.PI / 2
      g.add(w)
      return w
    })
    inner.add(g)
    birds.push({ g, a: i * 1.6, r: T * (0.55 + i * 0.1), h: 55 + i * 9, sp: 0.16 + i * 0.03, wings })
  }
  const dummy = new Object3D()
  const tuft = track(new ConeGeometry(0.6, 2.4, 5))
  tuft.translate(0, 1.2, 0)
  const tint = new Color()

  for (const z of layout.zones) {
    const gy = z.kind === 'sea' ? 0 : groundAt(z.x, z.z)
    zones[z.id] = { x: z.x, y: gy, z: z.z, r: z.r, kind: z.kind }
    const at = new Group()
    at.position.set(z.x, gy, z.z)
    decor.add(at)
    if (z.kind === 'grass') {
      const u = { value: 0 }
      shakers[z.id] = u
      const m = track(toon('#ffffff', { side: DoubleSide }))
      m.onBeforeCompile = (s: any) => {
        s.uniforms.uTime = timeU
        s.uniforms.uShake = u
        s.vertexShader = s.vertexShader
          .replace('void main() {', 'uniform float uTime; uniform float uShake;\nvoid main() {')
          .replace('#include <begin_vertex>', `#include <begin_vertex>
            float sw = sin(uTime * 2. + instanceMatrix[3].x * .5 + instanceMatrix[3].z * .4);
            float sk = uShake * sin(uTime * 40. + instanceMatrix[3].x * 3.);
            transformed.x += (sw * .35 + sk * .45) * position.y * position.y * .35;`)
      }
      const n = Math.round(z.r * z.r * 0.22)
      const mesh = new InstancedMesh(tuft, m, n)
      const cols = [pal.grass, mixC(pal.grass, '#ffffff', 0.2), mixC(pal.grass, '#0a7a4a', 0.3), new Color('#5fe3b4')]
      for (let i = 0; i < n; i++) {
        const a = rng() * Math.PI * 2
        const d = Math.sqrt(rng()) * z.r * 0.96
        const x = z.x + Math.cos(a) * d
        const zz = z.z + Math.sin(a) * d
        dummy.position.set(x, groundAt(x, zz) - 0.1, zz)
        dummy.rotation.set(0, rng() * 6, 0)
        const s = (0.9 + rng() * 0.9) * K
        dummy.scale.set(s, s * (0.8 + rng() * 0.8), s)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
        mesh.setColorAt(i, tint.copy(cols[i % cols.length]).offsetHSL(0, 0, (rng() - 0.5) * 0.06))
      }
      mesh.frustumCulled = false
      decor.add(mesh)
      for (let i = 0; i < 14; i++) {
        const a = rng() * 6.28
        const d = z.r * 0.3 + rng() * z.r * 0.65
        part('ball', CANDY[i % CANDY.length], z.x + Math.cos(a) * d, gy + 3, z.z + Math.sin(a) * d, 1.1)
      }
    } else if (z.kind === 'lake') {
      part('disc', '#ffffff', 0, 0.18, 0, z.r * 0.9 + 0.9, 0.36, z.r * 0.9 + 0.9, at)
      part('disc', mixC(pal.water, '#3fc4ff', 0.55), 0, 0.3, 0, z.r * 0.9, 0.36, z.r * 0.9, at)
      part('disc', mixC(pal.water, '#ffffff', 0.45), 0, 0.5, 0, z.r * 0.55, 0.2, z.r * 0.55, at)
      for (let i = 0; i < 8; i++) {
        const a = rng() * 6.28
        const d = rng() * z.r * 0.7
        part('cyl', '#5fe3b4', Math.cos(a) * d, 0.55, Math.sin(a) * d, 2.5, 0.2, 2.5, at)
        if (i % 2) part('ball', '#ff7aa8', Math.cos(a) * d, 1.3, Math.sin(a) * d, 1, 0.8, 1, at)
      }
      zones[z.id].y = gy + 0.35
      jets(at, timeU, { value: 1 }, { at: new Vector3(0, 0.6, 0), count: 22, height: 10, spread: 0.22, size: 2.4, life: 1.6, k: kU, seed: 7 })
    } else if (z.kind === 'sea') {
      const ring = new Mesh(track(new RingGeometry(z.r * 0.82, z.r, 28)), track(new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8, side: DoubleSide })))
      ring.rotation.x = -Math.PI / 2
      ring.position.y = 0.3
      at.add(ring)
      const boat = new Group()
      part('box', '#ff7aa8', 0, 1, 0, 6, 1.8, 2.6, boat)
      part('cone4', '#ffffff', 0, 4.2, 0, 1.8, 5, 0.3, boat)
      part('cyl', '#5a3a2a', 0, 3, 0, 0.18, 4, 0.18, boat)
      boat.scale.setScalar(K)
      boat.position.set(z.r * 0.1, 0.4, z.r * 0.2)
      at.add(boat)
      bobbers.push({ m: boat, y: 0.4, s: rng() * 6, a: rng() * 6, r: z.r * 0.25, cx: z.r * 0.1, cz: z.r * 0.1 })
      part('ball', '#ffd24a', -z.r * 0.4, 1.4, -z.r * 0.3, 1.8, 1.8, 1.8, at)
      jets(at, timeU, { value: 1 }, { at: new Vector3(-z.r * 0.1, 0.6, z.r * 0.3), count: geyser ? 60 : 30, height: geyser ? 40 : 18, spread: geyser ? 0.35 : 0.16, size: geyser ? 4 : 3, life: geyser ? 2.2 : 1.8, k: kU, seed: 21 })
    } else if (z.kind === 'mountain') {
      const peaks = 3 + Math.floor(z.r / 4)
      for (let i = 0; i < peaks; i++) {
        const a = (i / peaks) * 6.28 + rng()
        const d = i === 0 ? 0 : z.r * (0.28 + rng() * 0.2)
        const x = Math.cos(a) * d
        const zz = Math.sin(a) * d
        const h = z.r * (i === 0 ? 1.7 : 0.9 + rng() * 0.6)
        const w = z.r * (i === 0 ? 0.62 : 0.34 + rng() * 0.18)
        const tier = i % 2 ? mixC(pal.rock, '#7a6a90', 0.3) : pal.rock
        part('cone', tier, x, h / 2 - 0.4, zz, w, h, w, at)
        part('cone', snow, x, h * 0.8, zz, w * 0.42, h * 0.4, w * 0.42, at)
      }
    } else if (z.kind === 'cave') {
      const g0 = new Group()
      g0.rotation.y = Math.atan2(-z.x, -z.z)
      at.add(g0)
      const r0 = z.r * 0.7
      part('ball', mixC(pal.rock, '#7a6a90', 0.35), 0, 0, 0, r0 * 1.2, r0, r0, g0)
      const mouth = part('cyl', '#2a1f3d', 0, r0 * 0.34, r0 * 0.78, r0 * 0.46, 0.5, r0 * 0.46, g0)
      mouth.rotation.x = Math.PI / 2
      const lip = part('cyl', '#ffd24a', 0, r0 * 0.34, r0 * 0.74, r0 * 0.58, 0.4, r0 * 0.58, g0)
      lip.rotation.x = Math.PI / 2
      part('cone', '#ffffff', -r0 * 0.7, r0 * 0.1, r0 * 0.5, 0.8, 2.2, 0.8, g0)
    } else {
      // route: a sandy clearing with a sign
      part('cyl', '#fff1c4', 0, 0.12, 0, z.r, 0.24, z.r, at)
      part('cyl', '#f1d58a', 0, 0.2, 0, z.r * 0.82, 0.24, z.r * 0.82, at)
      part('cyl', '#8a5a3a', z.r * 0.6, 2.6, -z.r * 0.4, 0.42, 5.2, 0.42, at)
      part('box', '#ffd24a', z.r * 0.6, 5.4, -z.r * 0.4, 3.8, 2.1, 0.5, at)
    }
  }

  // ---- the countryside between the habitats: forest groves, glades with flowers, boulders
  const open = (x: number, z: number, pad = 1.2) =>
    groundAt(x, z) >= 1 &&
    isLand(seed, x, z, R * 0.93) &&
    !zoneAt(layout, x, z) &&
    !layout.zones.some((q) => q.kind !== 'sea' && Math.hypot(q.x - x, q.z - z) < q.r * pad + 4) &&
    !layout.towns.some((q) => Math.hypot(q.x - x, q.z - z) < 34) &&
    Math.hypot(layout.landmark.x - x, layout.landmark.z - z) > 30
  const swayMat = () => {
    const m = track(toon('#ffffff'))
    m.onBeforeCompile = (sh: any) => {
      sh.uniforms.uTime = timeU
      sh.vertexShader = sh.vertexShader.replace('void main() {', 'uniform float uTime;\nvoid main() {').replace('#include <begin_vertex>', `#include <begin_vertex>
        float gust = sin(uTime * 1.7 + instanceMatrix[3].x * .03 + instanceMatrix[3].z * .02);
        transformed.x += gust * max(position.y, 0.) * .05;
        transformed.z += sin(uTime * 1.3 + instanceMatrix[3].z * .04) * max(position.y, 0.) * .03;`)
    }
    return m
  }
  const trunkGeo = track(new CylinderGeometry(0.7, 1, 5, 6))
  trunkGeo.translate(0, 2.5, 0)
  const crownGeo = track(new IcosahedronGeometry(1, 1))
  const pineGeo = track(new ConeGeometry(4, 11, 7))
  pineGeo.translate(0, 8.5, 0)
  const TREES = 230
  const trunks = new InstancedMesh(trunkGeo, track(toon('#8a5a3a')), TREES)
  const crowns = new InstancedMesh(crownGeo, swayMat(), TREES)
  const pines = new InstancedMesh(pineGeo, swayMat(), TREES)
  let nt = 0
  let nc = 0
  let nn = 0
  const groves: { x: number; z: number; r: number }[] = []
  for (let tries = 0; tries < 900 && groves.length < 8; tries++) {
    const a = rng() * Math.PI * 2
    const d = Math.sqrt(rng()) * coastRadius(seed, a, R) * 0.8
    const g = { x: Math.cos(a) * d, z: Math.sin(a) * d, r: 20 + rng() * 14 }
    if (!open(g.x, g.z, 1.5) || groves.some((o) => Math.hypot(o.x - g.x, o.z - g.z) < (o.r + g.r) * 1.5)) continue
    groves.push(g)
  }
  const leafA = mixC(pal.grass, '#1b9a5a', 0.45)
  const leafB = mixC(pal.grass, '#ffffff', 0.05)
  const leafC = mixC(pal.grass, '#ff9ac0', 0.22)
  for (const g of groves) {
    const n = 22 + Math.floor(rng() * 8)
    const pine = rng() < 0.4
    for (let i = 0; i < n && nt < TREES; i++) {
      const a = rng() * Math.PI * 2
      const d = Math.sqrt(rng()) * g.r
      const x = g.x + Math.cos(a) * d
      const z = g.z + Math.sin(a) * d
      if (!open(x, z, 1.2)) continue
      const h = groundAt(x, z)
      const s = (0.85 + rng() * 0.6) * (1 - (d / g.r) * 0.3)
      dummy.rotation.set(0, rng() * 6, 0)
      if (pine || rng() < 0.2) {
        if (nn >= TREES) continue
        dummy.position.set(x, h - 0.2, z)
        dummy.scale.set(s, s * (0.9 + rng() * 0.4), s)
        dummy.updateMatrix()
        pines.setMatrixAt(nn, dummy.matrix)
        pines.setColorAt(nn++, tint.copy(leafA).offsetHSL((rng() - 0.5) * 0.04, 0.05, (rng() - 0.5) * 0.08))
      } else {
        dummy.position.set(x, h - 0.2, z)
        dummy.scale.set(s, s, s)
        dummy.updateMatrix()
        trunks.setMatrixAt(nt, dummy.matrix)
        trunks.setColorAt(nt++, tint.set('#8a5a3a'))
        dummy.position.set(x, h + (5 + 2.4) * s, z)
        dummy.scale.set(4.4 * s, 3.8 * s, 4.4 * s)
        dummy.updateMatrix()
        crowns.setMatrixAt(nc, dummy.matrix)
        crowns.setColorAt(nc++, tint.copy(rng() < 0.18 ? leafC : rng() < 0.5 ? leafB : leafA).offsetHSL(0, 0.05, (rng() - 0.5) * 0.06))
      }
    }
  }
  trunks.count = nt
  crowns.count = nc
  pines.count = nn
  ;[trunks, crowns, pines].forEach((m) => (m.frustumCulled = false))
  decor.add(trunks, crowns, pines)

  // meadow flowers in drifts, plus a few boulders and lone bushes
  const FL = 520
  const flowers = new InstancedMesh(geo.ball, track(toon('#ffffff')), FL)
  const stems = new InstancedMesh(geo.cyl, track(toon('#3fb870')), FL)
  const rocks = new InstancedMesh(geo.ico, track(toon('#ffffff')), 46)
  const bushes = new InstancedMesh(geo.ico, track(toon('#ffffff')), 70)
  let nf = 0
  let nr = 0
  let nb = 0
  for (let tries = 0; tries < 6000 && (nf < FL || nr < 46 || nb < 70); tries++) {
    const a = rng() * Math.PI * 2
    const d = Math.sqrt(rng()) * coastRadius(seed, a, R) * 0.88
    const x = Math.cos(a) * d
    const z = Math.sin(a) * d
    if (!open(x, z, 1.05) || groves.some((g) => Math.hypot(g.x - x, g.z - z) < g.r)) continue
    const h = groundAt(x, z)
    const k = rng()
    if (k < 0.55 && nf < FL) {
      // a drift: 5 flowers of one colour
      const colour = CANDY[Math.floor(rng() * CANDY.length)]
      for (let i = 0; i < 5 && nf < FL; i++) {
        const fx = x + (rng() - 0.5) * 9
        const fz = z + (rng() - 0.5) * 9
        if (!open(fx, fz, 1.05)) continue
        const fh = groundAt(fx, fz)
        dummy.rotation.set(0, 0, 0)
        dummy.position.set(fx, fh + 1.5, fz)
        dummy.scale.setScalar(0.95 + rng() * 0.5)
        dummy.updateMatrix()
        flowers.setMatrixAt(nf, dummy.matrix)
        flowers.setColorAt(nf, tint.set(colour))
        dummy.position.set(fx, fh + 0.7, fz)
        dummy.scale.set(0.16, 1.5, 0.16)
        dummy.updateMatrix()
        stems.setMatrixAt(nf++, dummy.matrix)
      }
    } else if (k < 0.75 && nr < 46) {
      const s = 1.6 + rng() * 2.4
      dummy.rotation.set(rng(), rng() * 6, rng())
      dummy.position.set(x, h + s * 0.35, z)
      dummy.scale.set(s * 1.3, s * 0.8, s)
      dummy.updateMatrix()
      rocks.setMatrixAt(nr, dummy.matrix)
      rocks.setColorAt(nr++, tint.copy(pal.rock).offsetHSL(0, 0, (rng() - 0.5) * 0.1))
    } else if (nb < 70) {
      const s = 1.6 + rng()
      dummy.rotation.set(0, rng() * 6, 0)
      dummy.position.set(x, h + 0.6 * s, z)
      dummy.scale.set(2 * s, 1.5 * s, 2 * s)
      dummy.updateMatrix()
      bushes.setMatrixAt(nb, dummy.matrix)
      bushes.setColorAt(nb++, tint.copy(rng() < 0.3 ? leafC : leafB).offsetHSL(0, 0.05, 0))
    }
  }
  flowers.count = stems.count = nf
  rocks.count = nr
  bushes.count = nb
  ;[flowers, stems, rocks, bushes].forEach((m) => (m.frustumCulled = false))
  decor.add(flowers, stems, rocks, bushes)

  // ---- towns, gyms and the Pokémon Center
  const townInfo: Island['towns'] = []
  const roofs = CANDY
  for (const t of layout.towns) {
    const gy = groundAt(t.x, t.z)
    townInfo.push({ id: t.id, name: t.name, gym: t.gym, x: t.x, y: gy, z: t.z })
    const town = new Group()
    town.position.set(t.x, gy, t.z)
    town.scale.setScalar(K * 0.78)
    decor.add(town)
    const hr = makeRng(hashSeed(region.id, t.id, 'town'))
    const n = 4 + Math.floor(hr() * 3)
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28 + hr() * 0.5
      const d = 8 + hr() * 5
      const w = 2.2 + hr() * 1
      const h = 2.4 + hr() * 1.8
      const x = Math.cos(a) * d
      const z = Math.sin(a) * d
      const gh = (groundAt(t.x + x * K, t.z + z * K) - gy) / K
      part('box', '#fff1d6', x, gh + h / 2, z, w, h, w, town)
      const roof = part('cone4', roofs[Math.floor(hr() * roofs.length)], x, gh + h + 1.7, z, w * 0.78, 3.6, w * 0.78, town)
      roof.rotation.y = Math.PI / 4
      part('box', '#ffd24a', x, gh + 1, z + w / 2 + 0.05, 0.9, 1.5, 0.1, town)
    }
    // the Pokémon Center: white walls and a red roof with a ball
    part('box', '#ffffff', 0, 2, 0, 6.4, 4, 4.8, town)
    part('box', '#ff5a6e', 0, 4.4, 0, 7, 1, 5.4, town)
    part('ball', '#ffffff', 0, 5.6, 0, 1.4)
    town.children.at(-1)!.position.set(0, 5.4, 0)
    part('cyl', '#ff5a6e', 0, 5.6, 2.8, 0.9, 0.2, 0.9, town).rotation.x = Math.PI / 2

    const gym = t.gym ? GYMS.find((q: any) => q.id === t.gym) : null
    const palace = t.id === 'league' || t.id === 'wyndon'
    if (gym || palace) {
      const colour = new Color(gym ? (TYPE_DATA as any)[gym.type].color : '#ffd24a')
      const b = new Group()
      b.position.set(10, 0, -4)
      town.add(b)
      const sz = palace ? 1.25 : 0.72
      part('box', '#ffffff', 0, 3.5 * sz, 0, 8 * sz, 7 * sz, 6.5 * sz, b)
      part('box', colour, 0, 6.8 * sz, 0, 9 * sz, 1.4 * sz, 7.4 * sz, b)
      part('cone4', colour, 0, 9.2 * sz, 0, 6.6 * sz, 4 * sz, 6.6 * sz, b).rotation.y = Math.PI / 4
      part('box', '#ffffff', 0, 1.6 * sz, 3.3 * sz, 2.4 * sz, 3.2 * sz, 0.3, b)
      if (palace)
        for (const sx of [-1, 1]) {
          part('cyl', '#ffffff', sx * 6.6, 6, 0, 1.6, 12, 1.6, b)
          part('cone', colour, sx * 6.6, 13.2, 0, 2.3, 3.4, 2.3, b)
        }
      part('cyl', '#5a3a2a', 0, 14 * sz, 0, 0.18, 6, 0.18, b)
      const flag = part('box', colour, 1.2, 15.6 * sz, 0, 2.4, 1.4, 0.1, b)
      flags.push(flag)
      ;(flag as any).userData.ox = 1.2
    }
  }

  // roads: a dark ribbon under a light one, with a dashed centre
  const ribbon = (curve: CatmullRomCurve3, w: number, y: number, colour: string) => {
    const n = 140
    const P: number[] = []
    const I: number[] = []
    for (let i = 0; i <= n; i++) {
      const pt = curve.getPoint(i / n)
      const tan = curve.getTangent(i / n)
      const nx = -tan.z
      const nz = tan.x
      // one height for the whole cross-section, from the widest ribbon, so both ribbons stay level
      let lift = groundAt(pt.x, pt.z)
      for (const s of [-1, 0, 1]) for (const k of [0.5, 1]) lift = Math.max(lift, groundAt(pt.x + nx * 5.4 * s * k, pt.z + nz * 5.4 * s * k))
      lift += 1.1
      for (const s of [-1, 1]) {
        const x = pt.x + nx * w * s
        const z = pt.z + nz * w * s
        P.push(x, lift + y, z)
      }
      if (i < n) I.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2)
    }
    const bg = track(new BufferGeometry())
    bg.setAttribute('position', new BufferAttribute(new Float32Array(P), 3))
    bg.setIndex(I)
    bg.computeVertexNormals()
    const rm = new Mesh(bg, track(new MeshBasicMaterial({ color: colour, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: -4 - y * 10, polygonOffsetUnits: -4 - y * 10 })))
    rm.renderOrder = 2
    decor.add(rm)
  }
  for (const route of layout.routes) {
    const A = layout.towns.find((q) => q.id === route.from)!
    const B = layout.towns.find((q) => q.id === route.to)!
    const len = Math.hypot(B.x - A.x, B.z - A.z)
    const bend = (makeRng(hashSeed(route.from, route.to))() - 0.5) * len * 0.25
    const pts = Array.from({ length: 7 }, (_, i) => {
      const u = i / 6
      const off = Math.sin(u * Math.PI) * bend
      return new Vector3(A.x + (B.x - A.x) * u + (-(B.z - A.z) / len) * off, 0, A.z + (B.z - A.z) * u + ((B.x - A.x) / len) * off)
    })
    const curve = new CatmullRomCurve3(pts)
    ribbon(curve, 5.4, 0.22, '#d9a24e')
    ribbon(curve, 3.9, 0.3, '#fff3c8')
  }

  // ---- one landmark per region
  const lm = new Group()
  lm.position.set(layout.landmark.x, groundAt(layout.landmark.x, layout.landmark.z), layout.landmark.z)
  lm.scale.setScalar(K * (layout.landmark.kind === 'prism' ? 0.45 : 0.8))
  decor.add(lm)
  const L = (kind: keyof typeof geo, c: string | Color, x: number, y: number, z: number, sx: number, sy = sx, sz = sx) => part(kind, c, x, y, z, sx, sy, sz, lm)
  const kind = layout.landmark.kind
  if (kind === 'tower') {
    for (let i = 0; i < 5; i++) L('box', i % 2 ? '#c79bff' : '#8a6ad8', 0, 3 + i * 5.2, 0, 11 - i * 1.4, 5.2, 11 - i * 1.4)
    L('cone4', '#ffd24a', 0, 31, 0, 6, 7, 6).rotation.y = Math.PI / 4
    for (let i = 0; i < 5; i++) L('ball', '#ffffff', 5.4 - i, 3 + i * 5.2, 5.6, 0.9)
  } else if (kind === 'pagoda') {
    for (let i = 0; i < 4; i++) {
      L('box', '#ffe9b8', 0, 3 + i * 6, 0, 8 - i * 1.4, 4, 8 - i * 1.4)
      L('cone4', '#ff7aa8', 0, 6 + i * 6, 0, 12 - i * 2, 2.6, 12 - i * 2).rotation.y = Math.PI / 4
    }
    L('cone', '#ffd24a', 0, 29, 0, 1, 6, 1)
  } else if (kind === 'volcano') {
    L('cone', '#d56a5a', 0, 11, 0, 20, 24, 20)
    L('cyl', '#ff9a3c', 0, 22.6, 0, 6.8, 1.4, 6.8)
    L('ball', '#ff5a3c', 0, 24, 0, 3.2, 3.2, 3.2)
    for (const [x, z] of [[8, 4], [-9, -2], [3, -9]]) L('ball', '#ff9a3c', x, 12 + x * 0.2, z, 1.2)
    for (let i = 0; i < 4; i++) {
      const a = i * 1.57 + 0.4
      const st = L('box', '#ff7a2a', Math.cos(a) * 7.2, 14, Math.sin(a) * 7.2, 1.5, 15, 1.1)
      st.rotation.set(Math.sin(a) * 0.5, -a, -Math.cos(a) * 0.5)
    }
  } else if (kind === 'spire') {
    L('cone', '#e2d8ff', 0, 14, 0, 7, 28, 7)
    L('ico', '#9a7cf0', 0, 31, 0, 3.4, 5, 3.4)
    for (let i = 0; i < 4; i++) L('ico', '#ffffff', Math.cos(i * 1.57) * 8, 3, Math.sin(i * 1.57) * 8, 1.8, 4, 1.8)
  } else if (kind === 'ferris') {
    const wheel = new Group()
    wheel.position.y = 16
    lm.add(wheel)
    const rim2 = new Mesh(track(new TorusGeometry(12, 0.7, 6, 28)), mat('#ffffff'))
    wheel.add(rim2)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * 6.28
      const spoke = part('box', '#ffd24a', Math.cos(a) * 6, Math.sin(a) * 6, 0, 12, 0.5, 0.5, wheel)
      spoke.rotation.z = a
      part('box', CANDY[i % 6], Math.cos(a) * 12, Math.sin(a) * 12 - 1.4, 0, 2.6, 2.4, 2.6, wheel)
    }
    L('box', '#ff7aa8', -7, 8, 0, 1.2, 16, 1.2).rotation.z = 0.2
    L('box', '#ff7aa8', 7, 8, 0, 1.2, 16, 1.2).rotation.z = -0.2
    spinners.push(wheel)
  } else if (kind === 'prism') {
    const crystal = L('ico', '#9fe6ff', 0, 14, 0, 7, 14, 7)
    crystal.rotation.y = 0.5
    L('ico', '#ff9ac8', 9, 5, 3, 3, 6, 3)
    L('ico', '#fff1a8', -8, 4, -4, 2.6, 5, 2.6)
    spinners.push(crystal)
  } else if (kind === 'palmhut') {
    L('cyl', '#ffe0a0', 0, 3, 0, 7, 6, 7)
    L('cone', '#ffb347', 0, 8, 0, 9.4, 5, 9.4)
    for (const [x, z] of [[10, 3], [-10, 5]]) {
      L('cyl', '#b07a4a', x, 7, z, 0.9, 14, 0.9)
      for (let i = 0; i < 5; i++) {
        const leaf = L('box', '#3fd079', x + Math.cos(i * 1.26) * 3.4, 14.4, z + Math.sin(i * 1.26) * 3.4, 6, 0.4, 1.6)
        leaf.rotation.y = -i * 1.26
        leaf.rotation.z = 0.35
      }
    }
  } else if (kind === 'castle') {
    L('box', '#f1ece4', 0, 5, 0, 16, 10, 12)
    for (const sx of [-9, 9]) {
      L('cyl', '#f1ece4', sx, 8, 0, 3.2, 16, 3.2)
      L('cone', '#7a9aff', sx, 18, 0, 4, 5, 4)
    }
    L('box', '#e0d8cc', 0, 12, 0, 7, 8, 7)
    L('cone', '#ff7a8a', 0, 18.4, 0, 5.4, 6, 5.4)
  } else {
    L('cyl', '#d56a5a', 0, 1.6, 0, 16, 3.2, 16)
    L('cyl', '#ff9a3c', 0, 3.2, 0, 11, 0.8, 11)
    L('cyl', '#ffd24a', 0, 3.7, 0, 6, 0.8, 6)
    L('cone', '#ffffff', 0, 9, -8, 1.6, 12, 1.6)
    L('ico', '#ff5a3c', 0, 5, 0, 2.6)
  }

  const weather = createWeather(kinds, { T, time: timeU, amt: amtU, k: kU, kl: klU, lm, seed: hashSeed(region.id, 'weather') })
  weather.group.visible = false
  inner.add(weather.group)

  // the island's name over it, for phones that cannot hover
  const { tex, ratio } = pillTexture(region.name, { accent: region.palette.glow })
  owned.push(tex)
  const label = new Sprite(track(new SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false })))
  label.renderOrder = 30
  label.position.set(0, 90, 0)
  inner.add(label)

  // hover: bounce, white border turns candy pink
  let hoverOn = false
  let hoverT = 0
  let age = 99
  const borderMat = border.material as MeshBasicMaterial
  const phase = rng() * 6
  return {
    regionId: region.id,
    root, inner, hit, label, labelRatio: ratio, lmScale: K * 1.15,
    zones, towns: townInfo, groundAt, isLand: (x: number, z: number) => isLand(seed, x, z, R),
    // water things may stand in the sea tray; the rest stay on the land
    keepOnLand: (x: number, z: number, water = false) => {
      const d = Math.hypot(x, z) || 1
      const max = water ? T * 0.93 : coastRadius(seed, Math.atan2(z, x), R) * 0.86
      return d > max ? { x: (x / d) * max, z: (z / d) * max } : { x, z }
    },
    top: () => root.localToWorld(new Vector3(layout.landmark.x * 0, 34, 0)),
    setHover(on) {
      if (on && !hoverOn) age = 0
      hoverOn = on
    },
    shake(id) {
      if (shakers[id]) shakers[id].value = 1
    },
    update(dt, t, focus) {
      timeU.value = t
      kU.value = root.scale.x
      klU.value = root.scale.x * K * 1.15
      amtU.value += (focus - amtU.value) * Math.min(1, dt * 3)
      weather.group.visible = amtU.value > 0.03
      weather.update(dt, t)
      age += dt
      hoverT += ((hoverOn ? 1 : 0) - hoverT) * Math.min(1, dt * 9)
      const bounce = Math.sin(age * 15) * Math.exp(-age * 4.5) * 0.16
      inner.scale.set(1 - bounce * 0.55 + hoverT * 0.05, 1 + bounce + hoverT * 0.05, 1 - bounce * 0.55 + hoverT * 0.05)
      inner.position.y = Math.sin(t * 0.8 + phase) * 1.6 + hoverT * 6
      inner.rotation.y = Math.sin(t * 0.3 + phase) * 0.02 + (hoverOn ? Math.sin(age * 6) * 0.03 * Math.exp(-age) : 0)
      borderMat.color.set(hoverOn ? '#ff7aa8' : '#ffffff')
      for (const s of Object.values(shakers)) if (s.value > 0) s.value = Math.max(0, s.value - dt * 1.6)
      for (const w of spinners) w.rotation.z += dt * 0.25
      for (const b of birds) {
        const a = b.a + t * b.sp
        b.g.position.set(Math.cos(a) * b.r, b.h + Math.sin(t * 0.9 + b.a) * 4, Math.sin(a) * b.r)
        b.g.rotation.y = -a
        b.wings[0].rotation.x = Math.sin(t * 9 + b.a) * 0.6
        b.wings[1].rotation.x = -Math.sin(t * 9 + b.a) * 0.6
      }
      for (const f of flags) f.rotation.y = Math.sin(t * 3 + f.position.x) * 0.35
      for (const b of bobbers) {
        b.m.position.y = b.y + Math.sin(t * 1.4 + b.s) * 0.35
        b.m.rotation.z = Math.sin(t * 1.1 + b.s) * 0.06
        b.m.position.x = (b.cx ?? 0) + Math.cos(t * 0.2 + (b.a ?? 0)) * (b.r ?? 0)
        b.m.position.z = (b.cz ?? 0) + Math.sin(t * 0.2 + (b.a ?? 0)) * (b.r ?? 0)
      }
    },
    dispose() {
      root.removeFromParent()
      for (const d of owned) d.dispose()
    },
  }
}
void FLOOR
void smooth
void OctahedronGeometry
