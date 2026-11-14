import { AmbientLight, Color, DirectionalLight, Euler, Fog, HemisphereLight, PerspectiveCamera, Quaternion, Raycaster, Scene, Vector2, Vector3, WebGLRenderer } from 'three'
import { FOV, ease, flyPose, focusPose, overviewPose, regionPose } from '../camera.mjs'
import { SPACING, approach, clampIndex, settle, slotAt } from '../carousel.mjs'
import { REGIONS } from '../data/regions.mjs'
import { REGION_R, TRAY, layoutRegion } from '../layout.mjs'
import { GYMS } from '../data/gyms.mjs'
import { NPC_COUNT, gymLeaderLook, generateNpcs } from '../npc.mjs'
import { rollRegion, slotOf } from '../spawn.mjs'
import { nextSlotDelay } from '../billboardState.mjs'
import { createBillboards } from './Billboards'
import type { Filters, Hit } from './Billboards'
import { createIsland } from './Island'
import type { Island } from './Island'
import { createParticles } from './Particles'
import { createSky } from './Sky'
import { viewH } from './Weather'

export type { Filters, Hit }
export type HoverInfo = { hit: Hit; x: number; y: number; touch: boolean }
export type WorldOptions = {
  canvas: HTMLCanvasElement
  reduced: boolean
  dprMax: number
  onPick: (hit: Hit) => void
  onHover: (info: HoverInfo | null) => void
  onLost: () => void
  onMoved: (away: boolean) => void
  onActive: (id: string) => void
}
export type World = {
  /** slide the carousel to an island (and fly in when `enter`) */
  setActive(id: string): void
  setRegion(id: string | null): Promise<void>
  setFilters(f: Filters): void
  setOwned(owned: Set<number>): void
  focus(kind: string, id: string, regionId?: string): void
  resetView(): void
  resize(): void
  dispose(): void
}

export function webglOk() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

type Pose = ReturnType<typeof overviewPose>
const FLIGHT_S = 1.5
const T = REGION_R * TRAY
const UNIT = T * 0.85
const v3 = (a: number[]) => new Vector3(a[0], a[1], a[2])

export function createWorld(opts: WorldOptions): World {
  const { canvas, reduced } = opts
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.dprMax))
  const scene = new Scene()
  scene.background = new Color('#cfeeff')
  scene.fog = new Fog('#e9f6ff', 2400, 6000)
  const camera = new PerspectiveCamera(FOV, 1, 4, 9000)
  scene.add(new HemisphereLight('#ffffff', '#ffc2de', 0.62))
  scene.add(new AmbientLight('#fff4ff', 0.12))
  const sun = new DirectionalLight('#fff6dd', 0.85)
  sun.position.set(-300, 600, 400)
  scene.add(sun)

  const sky = createSky(scene, { reduced })
  const particles = createParticles(scene)
  const islands: Island[] = []
  const islandBy = new Map<string, Island>()
  const layouts = new Map<string, ReturnType<typeof layoutRegion>>()
  for (const r of REGIONS) {
    const layout = layoutRegion(r)
    const island = createIsland(r, layout)
    layouts.set(r.id, layout)
    islands.push(island)
    islandBy.set(r.id, island)
    scene.add(island.root)
  }
  const N = islands.length
  const boards = createBillboards(islandBy, particles, { reduced })
  let owned = new Set<number>()
  let filters: Filters = { pokemon: true, npc: true, gym: true }
  let region: string | null = null
  let aspect = 1.6
  let vw = 1
  let vh = 1
  let time = 0
  let disposed = false
  let raf = 0
  let last = performance.now()
  const vanish = new Map<string, number>(islands.map((i) => [i.regionId, 0]))

  // the carousel: `pos` slides (fractional while a finger drags), `index` is where it settles
  let pos = 0
  let index = 0
  let dragging = false

  // the camera never turns: it has a target, a fixed tilt and a distance
  let home: Pose = overviewPose(aspect)
  const target = v3(home.target)
  let pitch = home.pitch
  let dist = home.dist
  let flight: { t0: number; dur: number; from: Pose; to: Pose } | null = null
  let away = false
  const q = new Quaternion()
  const euler = new Euler(0, 0, 0, 'YXZ')

  const poseFor = (id: string | null): Pose => (id ? regionPose(aspect) : overviewPose(aspect))
  const idAt = (i: number) => islands[clampIndex(i, N)].regionId
  const indexOf = (id: string) => Math.max(0, islands.findIndex((i) => i.regionId === id))

  const fit = () => {
    const w = canvas.clientWidth || 1
    const h = canvas.clientHeight || 1
    renderer.setSize(w, h, false)
    vw = w
    vh = h
    aspect = w / h
    camera.aspect = aspect
    camera.updateProjectionMatrix()
    viewH.value = h * renderer.getPixelRatio()
    if (!flight) {
      const p = poseFor(region)
      home = p
      if (!away) {
        target.copy(v3(p.target))
        dist = p.dist
        pitch = p.pitch
      }
    }
  }

  const current = (): Pose => ({ target: target.toArray(), yaw: 0, pitch, dist })
  const flyTo = (to: Pose, dur = FLIGHT_S) => {
    if (reduced) {
      target.copy(v3(to.target))
      pitch = to.pitch
      dist = to.dist
      flight = null
      return
    }
    flight = { t0: time, dur, from: current(), to }
  }
  const fly = (p: Pose) => {
    flyTo(p)
    away = false
    opts.onMoved(false)
  }

  const apply = () => {
    euler.set(pitch, 0, 0)
    q.setFromEuler(euler)
    camera.quaternion.copy(q)
    camera.position.set(0, 0, dist).applyQuaternion(q).add(target)
    camera.updateMatrixWorld()
  }

  const populate = (id: string) => {
    const r = REGIONS.find((x) => x.id === id)!
    const layout = layouts.get(id)!
    const rolled = rollRegion({ regionId: id, zones: layout.zones, slot: slotOf(Date.now()), owned })
    const npcs = generateNpcs({ regionId: id, zones: layout.zones, towns: layout.towns, seed: 1, count: NPC_COUNT })
    const gyms = GYMS.filter((g: any) => g.region === id).map((g: any) => ({ ...g, look: gymLeaderLook(g) }))
    boards.populate(r.id, rolled, npcs, gyms)
    boards.setFilters(filters)
  }
  let slotTimer: ReturnType<typeof setTimeout> | undefined
  const rearm = () => {
    clearTimeout(slotTimer)
    slotTimer = setTimeout(() => {
      if (disposed) return
      if (region) populate(region)
      rearm()
    }, nextSlotDelay(Date.now()) + 50)
  }
  rearm()

  let lastActive = ''
  const announce = () => {
    const id = idAt(index)
    if (id !== lastActive) {
      lastActive = id
      sky.tint(REGIONS.find((r: any) => r.id === id)!.palette.sky)
      opts.onActive(id)
    }
  }

  const frame = (now: number) => {
    raf = 0
    if (disposed || document.hidden) return
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    time += dt
    if (!dragging) pos = reduced ? index : approach(pos, index, dt)
    if (flight) {
      const u = Math.min(1, (time - flight.t0) / flight.dur)
      const p = flyPose(flight.from, flight.to, ease(u), 0.22)
      target.copy(v3(p.target))
      dist = p.dist
      pitch = p.pitch
      if (u >= 1) flight = null
    }
    for (let i = 0; i < N; i++) {
      const island = islands[i]
      const id = island.regionId
      const s = slotAt(i - pos)
      const gone = vanish.get(id)! + (((region && id !== region ? 1 : 0) - vanish.get(id)!) * Math.min(1, dt * 4))
      vanish.set(id, gone)
      const sc = s.scale * (1 - ease(Math.min(1, gone)))
      island.root.position.set(s.x * UNIT, s.y * T, s.z * T)
      island.root.rotation.y = s.yaw
      island.root.scale.setScalar(Math.max(0.0001, sc))
      island.root.visible = s.visible && sc > 0.01
      island.label.visible = false
      island.update(dt, time, region ? (id === region ? 1 : 0) : Math.max(0, 1 - Math.abs(i - pos) * 1.6))
    }
    sky.update(dt, time, camera)
    boards.update(dt, time, camera, vw, vh)
    particles.update(dt, camera, vh)
    apply()
    if (region) {
      const base = poseFor(region)
      const far = !flight && (Math.abs(dist - base.dist) > base.dist * 0.08 || target.distanceTo(v3(base.target)) > 4)
      if (far !== away) {
        away = far
        opts.onMoved(far)
      }
    }
    renderer.render(scene, camera)
    raf = requestAnimationFrame(frame)
  }
  const wake = () => {
    if (!raf && !disposed) {
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
  }

  const go = (i: number) => {
    const next = clampIndex(i, N)
    if (next !== index) index = next
    announce()
  }

  // ---- picking
  const ray = new Raycaster()
  const ndc = new Vector2()
  const hitIsland = (x: number, y: number): Island | null => {
    if (region) return null
    ndc.set((x / vw) * 2 - 1, -(y / vh) * 2 + 1)
    ray.setFromCamera(ndc, camera)
    const live = islands.filter((i) => i.root.visible)
    const hits = ray.intersectObjects(live.flatMap((i) => i.hit), false)
    return hits.length ? (islandBy.get(hits[0].object.userData.id) ?? null) : null
  }
  const what = (x: number, y: number, minRadius: number): Hit | null => {
    const c = boards.pick(x, y, minRadius)
    if (c) return c
    const i = hitIsland(x, y)
    return i ? { kind: 'island', id: i.regionId } : null
  }
  let hoverKey = ''
  const setHover = (h: Hit | null, x = 0, y = 0, touch = false) => {
    const key = h ? `${h.kind}:${h.id}` : ''
    for (const i of islands) i.setHover(h?.kind === 'island' && h.id === i.regionId)
    if (key !== hoverKey) {
      hoverKey = key
      boards.hover(h && h.kind !== 'island' ? h : null)
      if (h?.kind === 'island' && !reduced && !touch) {
        const i = islandBy.get(h.id)!
        particles.burst(i.root.localToWorld(new Vector3(0, 70, 0)), null, 'star', 12, 2)
      }
    }
    opts.onHover(h && h.kind !== 'town' ? { hit: h, x, y, touch } : null)
  }

  // ---- pointers: swipe the carousel, or pan the region
  const ptrs = new Map<number, { x: number; y: number }>()
  let downAt = { x: 0, y: 0, t: 0 }
  let travelled = 0
  let vel = 0
  let lastMove = 0
  const rect = () => canvas.getBoundingClientRect()
  const local = (e: PointerEvent) => {
    const r = rect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const pan = (dx: number, dy: number) => {
    const k = (2 * dist * Math.tan((camera.fov * Math.PI) / 360)) / vh
    target.x -= dx * k
    target.z -= (dy * k) / Math.max(0.35, Math.sin(Math.abs(pitch)))
    const lim = region ? REGION_R * 0.92 : T * 0.75
    const d = Math.hypot(target.x, target.z)
    if (d > lim) {
      target.x *= lim / d
      target.z *= lim / d
    }
  }
  const down = (e: PointerEvent) => {
    canvas.setPointerCapture?.(e.pointerId)
    ptrs.set(e.pointerId, local(e))
    if (ptrs.size === 1) {
      downAt = { ...local(e), t: performance.now() }
      travelled = 0
      vel = 0
      dragging = !region
      lastMove = performance.now()
    }
    flight = region ? null : flight
    wake()
  }
  const move = (e: PointerEvent) => {
    const p = ptrs.get(e.pointerId)
    const now = local(e)
    if (!p) {
      if (e.pointerType === 'mouse') {
        const h = what(now.x, now.y, 18)
        setHover(h, now.x, now.y)
        canvas.style.cursor = h ? 'pointer' : 'grab'
      }
      return
    }
    const dx = now.x - p.x
    const dy = now.y - p.y
    if (ptrs.size === 1) {
      travelled += Math.hypot(dx, dy)
      if (!region) {
        if (travelled > 4) {
          const per = Math.min(vw * 0.46, 380)
          pos = Math.min(N - 1, Math.max(0, pos - dx / per))
          const t = performance.now()
          vel = vel * 0.6 + (-dx / per / Math.max(0.008, (t - lastMove) / 1000)) * 0.4
          lastMove = t
          setHover(null)
        }
      } else if (travelled > 4) pan(dx, dy)
      p.x = now.x
      p.y = now.y
    } else if (ptrs.size === 2 && region) {
      const [a, b] = [...ptrs.values()]
      const before = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      p.x = now.x
      p.y = now.y
      pan((a.x + b.x) / 2 - before.x, (a.y + b.y) / 2 - before.y)
      travelled += 10
    }
  }
  const up = (e: PointerEvent) => {
    const had = ptrs.has(e.pointerId)
    const single = ptrs.size === 1
    ptrs.delete(e.pointerId)
    if (!had || !single) return
    const now = local(e)
    const tap = travelled <= 8 && performance.now() - downAt.t <= 450
    if (dragging) {
      dragging = false
      if (!tap) {
        index = settle(pos, Math.abs(vel) > 0.6 ? Math.max(-2.2, Math.min(2.2, vel)) : 0, N)
        announce()
        return
      }
      index = clampIndex(Math.round(pos), N)
    }
    if (!tap) return
    const touch = e.pointerType !== 'mouse'
    const h = what(now.x, now.y, touch ? 28 : 18)
    if (!h) {
      setHover(null)
      return
    }
    if (h.kind === 'island') {
      if (idAt(index) === h.id) opts.onPick({ kind: 'island', id: h.id })
      else go(indexOf(h.id))
      return
    }
    if (h.kind === 'town') {
      const t = boards.positionOf('town', h.id, region ?? undefined)
      if (t) fly(focusPose(t.local, poseFor(region), 0.42))
      return
    }
    if (touch) setHover(h, now.x, now.y, true)
    opts.onPick(h)
  }
  const leave = () => {
    if (!ptrs.size) setHover(null)
  }
  let wheelAcc = 0
  let wheelAt = 0
  const wheel = (e: WheelEvent) => {
    e.preventDefault()
    if (region) {
      pan(-e.deltaX, -e.deltaY)
      flight = null
    } else {
      wheelAcc += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      if (Math.abs(wheelAcc) > 50 && performance.now() - wheelAt > 260) {
        go(index + Math.sign(wheelAcc))
        wheelAcc = 0
        wheelAt = performance.now()
      }
    }
    wake()
  }
  const key = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement)?.closest?.('input, textarea')) return
    const k = e.key
    if (!region) {
      if (k === 'ArrowLeft') go(index - 1)
      else if (k === 'ArrowRight') go(index + 1)
      else if (k === 'Enter') opts.onPick({ kind: 'island', id: idAt(index) })
      else return
    } else {
      const step = 40
      if (k === 'ArrowLeft') pan(step, 0)
      else if (k === 'ArrowRight') pan(-step, 0)
      else if (k === 'ArrowUp') pan(0, step)
      else if (k === 'ArrowDown') pan(0, -step)
      else if (k === '0') fly(poseFor(region))
      else return
      flight = null
    }
  }
  const ctx = (e: Event) => e.preventDefault()
  const lost = (e: Event) => {
    e.preventDefault()
    opts.onLost()
  }
  const visible = () => {
    if (!document.hidden) wake()
  }
  canvas.addEventListener('pointerdown', down)
  canvas.addEventListener('pointermove', move)
  canvas.addEventListener('pointerup', up)
  canvas.addEventListener('pointercancel', up)
  canvas.addEventListener('pointerleave', leave)
  canvas.addEventListener('wheel', wheel, { passive: false })
  canvas.addEventListener('contextmenu', ctx)
  canvas.addEventListener('webglcontextlost', lost)
  window.addEventListener('keydown', key)
  document.addEventListener('visibilitychange', visible)
  const observer = new ResizeObserver(() => fit())
  observer.observe(canvas)
  fit()
  home = overviewPose(aspect)
  target.copy(v3(home.target))
  dist = home.dist
  pitch = home.pitch
  announce()
  wake()

  return {
    setActive(id) {
      go(indexOf(id))
      wake()
    },
    async setRegion(id) {
      region = id
      setHover(null)
      boards.setActive(id)
      if (id) {
        index = indexOf(id)
        pos = index
        announce()
        populate(id)
        if (!reduced) {
          const c = v3([0, 40, 0])
          for (let k = 0; k < 4; k++) particles.burst(c.clone().add(new Vector3(0, k * 14, 0)), ['#ffffff', '#e4f3ff', '#ffd9ec'], 'dot', 12, 5 + k)
        }
      }
      home = poseFor(id)
      fly(home)
      wake()
    },
    setFilters(f) {
      filters = f
      boards.setFilters(f)
    },
    setOwned(next) {
      const same = next.size === owned.size && [...next].every((i) => owned.has(i))
      owned = next
      boards.setOwned(next)
      if (!same && region) populate(region)
    },
    focus(kind, id, regionId) {
      const at = boards.positionOf(kind, id, regionId)
      if (!at) return
      fly(focusPose(at.local, poseFor(at.island), 0.4))
    },
    resetView() {
      fly(poseFor(region))
    },
    resize: fit,
    dispose() {
      disposed = true
      cancelAnimationFrame(raf)
      clearTimeout(slotTimer)
      observer.disconnect()
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', up)
      canvas.removeEventListener('pointerleave', leave)
      canvas.removeEventListener('wheel', wheel)
      canvas.removeEventListener('contextmenu', ctx)
      canvas.removeEventListener('webglcontextlost', lost)
      window.removeEventListener('keydown', key)
      document.removeEventListener('visibilitychange', visible)
      boards.dispose()
      particles.dispose()
      for (const island of islands) island.dispose()
      sky.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
void SPACING
