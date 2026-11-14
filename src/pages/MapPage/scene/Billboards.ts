import {
  AdditiveBlending, CanvasTexture, Color, Group, SRGBColorSpace, Mesh, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry, Sprite,
  SpriteMaterial, Texture, TextureLoader, Vector3,
} from 'three'
import { getPokemonImage, getPokemonSprite } from 'pages/PokemonPage/navigation.mjs'
import { TYPE_DATA } from '../../../components/pokemon-page/type-data.mjs'
import { typesOf } from '../../../components/pokemon-page/type-index.mjs'
import { auraOf, textureBudget, visibleKinds } from '../billboardState.mjs'
import { declutter, pickNearest, spriteLimits, spriteScale } from '../framing.mjs'
import { spread } from '../spread.mjs'
import { portraitSvg } from '../portrait.mjs'
import { hashSeed, makeRng } from '../rng.mjs'
import { tierOf } from '../tiers.mjs'
import { INK, biasDepth, outlineMaterial, pillTexture } from './flat'
import type { Island } from './Island'
import type { Particles } from './Particles'

export type Filters = { pokemon: boolean; npc: boolean; gym: boolean }
type Kind = 'pokemon' | 'npc' | 'gym' | 'town'
export type Hit = { kind: Kind | 'island'; id: string }
type Item = {
  kind: Kind
  id: string
  island: Island
  group: Group
  sprite: Sprite
  line: Sprite
  shadow: Mesh
  bias: { value: number }
  aura?: Sprite
  pos: [number, number, number]
  size: number
  ratio: number
  priority: number
  phase: number
  fade: number
  want: number
  hover: number
  age: number
  pokemonId?: number
  colours: string[]
  px: number
  sx: number
  sy: number
  depth: number
}

const AURA: Record<string, string> = { pseudo: '#b58cff', legendary: '#ffd24a', mythical: '#ff7aa8' }
const RANK: Record<string, number> = { mythical: 40, legendary: 34, pseudo: 28, veryRare: 18, rare: 8, uncommon: 4, common: 0 }
const MAX_TEXTURES = 260
const ART_PX = 256

export type Billboards = ReturnType<typeof createBillboards>

export function createBillboards(islands: Map<string, Island>, particles: Particles, opts: { reduced: boolean }) {
  const loader = new TextureLoader()
  loader.setCrossOrigin('anonymous')
  const cache = new Map<string, Texture>()
  const busy = new Map<string, Promise<Texture | null>>()
  const items = new Map<string, Item>()
  const byRegion = new Map<string, Item[]>()
  const spawns = new Map<string, { rolled: Record<string, number[]>; npcs: any[]; gyms: any[] }>()
  let owned = new Set<number>()
  let shown = visibleKinds({ pokemon: true, npc: true, gym: true })
  let alive = true
  let active: string | null = null
  let frame = 0
  let hovered: Item | null = null
  const shadowGeo = new PlaneGeometry(1, 1)
  const glowTex = (() => {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const g = c.getContext('2d')!
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    r.addColorStop(0, 'rgba(255,255,255,1)')
    r.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = r
    g.fillRect(0, 0, 64, 64)
    return new CanvasTexture(c)
  })()
  const placeholder = (() => {
    const c = document.createElement('canvas')
    c.width = c.height = 96
    const g = c.getContext('2d')!
    g.fillStyle = '#ffffff'
    g.strokeStyle = INK
    g.lineWidth = 6
    g.beginPath()
    g.arc(48, 48, 38, 0, Math.PI * 2)
    g.fill()
    g.stroke()
    g.fillStyle = INK
    g.font = '800 52px system-ui'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText('?', 48, 52)
    const t = new CanvasTexture(c)
    t.colorSpace = SRGBColorSpace
    return t
  })()

  const remember = (key: string, tex: Texture) => {
    cache.set(key, tex)
    if (cache.size > MAX_TEXTURES) {
      const oldest = cache.keys().next().value as string
      cache.get(oldest)?.dispose()
      cache.delete(oldest)
    }
  }
  const load = (key: string, urls: string[]) => {
    const hit = cache.get(key)
    if (hit) return Promise.resolve(hit)
    const run = busy.get(key)
    if (run) return run
    const task = (async () => {
      for (const url of urls) {
        try {
          const tex = await loader.loadAsync(url)
          if (!alive) {
            tex.dispose()
            return null
          }
          const src = tex.image as HTMLImageElement
          const k = Math.min(1, ART_PX / Math.max(src.width, src.height))
          const c = document.createElement('canvas')
          c.width = Math.max(1, Math.round(src.width * k))
          c.height = Math.max(1, Math.round(src.height * k))
          c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height)
          tex.dispose()
          const small = new CanvasTexture(c)
          small.anisotropy = 4
          small.colorSpace = SRGBColorSpace
          remember(key, small)
          return small
        } catch {
          // next source
        }
      }
      return null
    })()
    busy.set(key, task)
    task.finally(() => busy.delete(key))
    return task
  }
  const portrait = (look: any): Promise<Texture | null> => {
    const key = `look:${JSON.stringify(look)}`
    const hit = cache.get(key)
    if (hit) return Promise.resolve(hit)
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(new Blob([portraitSvg(look, 192)], { type: 'image/svg+xml' }))
      img.onload = () => {
        URL.revokeObjectURL(url)
        if (!alive) return resolve(null)
        const c = document.createElement('canvas')
        c.width = 192
        c.height = 234
        c.getContext('2d')!.drawImage(img, 0, 0, 192, 234)
        const tex = new CanvasTexture(c)
        tex.colorSpace = SRGBColorSpace
        remember(key, tex)
        resolve(tex)
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(null)
      }
      img.src = url
    })
  }

  const skin = (it: Item, tex: Texture | null) => {
    if (!alive) return
    const t = tex ?? placeholder
    ;(it.sprite.material as SpriteMaterial).map = t
    ;(it.line.material as SpriteMaterial).map = t
    ;(it.sprite.material as SpriteMaterial).needsUpdate = true
    ;(it.line.material as SpriteMaterial).needsUpdate = true
    const img = t.image as { width: number; height: number }
    it.ratio = img.width / img.height
    it.want = 1
  }

  const make = (kind: Kind, id: string, island: Island, pos: [number, number, number], size: number, extra: { pokemonId?: number; priority: number; ring?: boolean; aura?: string; colours: string[] }) => {
    const group = new Group()
    group.position.set(pos[0], pos[1], pos[2])
    const sprite = new Sprite(new SpriteMaterial({ map: placeholder, transparent: true, depthWrite: false, alphaTest: 0.02, opacity: 0 }))
    const line = new Sprite(outlineMaterial(placeholder as any))
    const bias = { value: 0 }
    biasDepth(sprite.material as SpriteMaterial, bias)
    biasDepth(line.material as SpriteMaterial, bias, true)
    ;(line.material as SpriteMaterial).opacity = 0
    sprite.renderOrder = 6
    line.renderOrder = 5
    sprite.userData = line.userData = { kind, id }
    const shadow = new Mesh(shadowGeo, new MeshBasicMaterial({ map: glowTex, color: '#3b2a52', transparent: true, opacity: 0.28, depthWrite: false }))
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = 0.2
    group.add(line, sprite, shadow)
    const it: Item = {
      kind, id, island, group, sprite, line, shadow, bias, pos, size, ratio: 1, priority: extra.priority, phase: makeRng(hashSeed(id))() * 6.28,
      fade: 0, want: 0, hover: 0, age: 9, pokemonId: extra.pokemonId, colours: extra.colours, px: 40, sx: 0, sy: 0, depth: 0,
    }
    if (extra.aura && auraOf(extra.aura) !== 'none') {
      const aura = new Sprite(new SpriteMaterial({ map: glowTex, color: AURA[extra.aura], transparent: true, depthWrite: false, opacity: 0.55, blending: AdditiveBlending }))
      aura.position.y = size * 0.5
      aura.userData.aura = extra.aura
      group.add(aura)
      it.aura = aura
    }
    island.inner.add(group)
    items.set(`${kind}:${id}`, it)
    return it
  }
  const clear = (regionId: string) => {
    for (const it of byRegion.get(regionId) ?? []) {
      items.delete(`${it.kind}:${it.id}`)
      if (hovered === it) hovered = null
      it.group.removeFromParent()
      ;(it.sprite.material as SpriteMaterial).dispose()
      ;(it.line.material as SpriteMaterial).dispose()
      ;(it.shadow.material as MeshBasicMaterial).dispose()
      ;(it.aura?.material as SpriteMaterial | undefined)?.dispose()
    }
    byRegion.delete(regionId)
  }

  // characters stand around their habitat's edge, well apart from each other
  const spot = (island: Island, zone: { x: number; y: number; z: number; r: number; kind: string }, i: number, n: number): [number, number, number] => {
    const rng = makeRng(hashSeed(island.regionId, zone.x, i))
    const water = zone.kind === 'sea' || zone.kind === 'lake'
    const a = (i / Math.max(1, n)) * Math.PI * 2 + rng() * 0.5 + zone.x
    const d = zone.r * (water ? 0.45 : 1.05) + zone.r * (water ? 0.35 : 0.55) * rng()
    const x = zone.x + Math.cos(a) * d
    const z = zone.z + Math.sin(a) * d
    return [x, water ? zone.y + 0.5 : island.groundAt(x, z), z]
  }

  const build = (regionId: string) => {
    const island = islands.get(regionId)
    const sp = spawns.get(regionId)
    if (!island || !sp) return
    clear(regionId)
    const made: Item[] = []
    const all = Object.entries(sp.rolled).flatMap(([zone, ids]) => ids.map((id) => ({ id, zone })))
    const keep = new Set(textureBudget(all.map((x) => x.id), 400, owned))
    all.forEach(({ id, zone }, k) => {
      const z = island.zones[zone]
      if (!z) return
      const sibs = sp.rolled[zone]
      const tier = tierOf(id)
      const types = typesOf(id) as string[]
      const colours = types.map((t) => (TYPE_DATA as any)[t]?.color).filter(Boolean)
      const it = make('pokemon', `${id}@${zone}`, island, spot(island, z, sibs.indexOf(id), sibs.length), tier === 'legendary' || tier === 'mythical' ? 30 : 23, {
        pokemonId: id, priority: 20 + RANK[tier] + (owned.has(id) ? 40 : 0), aura: tier, colours: colours.length ? colours : ['#ffd24a'],
      })
      it.group.userData.water = /^(lake|sea)/.test(zone)
      it.group.visible = shown.has('pokemon')
      if (keep.has(k)) load(`p:${id}`, [getPokemonImage(id), getPokemonSprite(id)]).then((t) => skin(it, t))
      else skin(it, null)
      made.push(it)
    })
    sp.npcs.forEach((n) => {
      const it = make('npc', n.id, island, [n.x, island.groundAt(n.x, n.z), n.z], 24, { priority: 10, colours: ['#ff7aa8', '#ffd24a', '#5fe3b4', '#7ac8ff'] })
      it.group.visible = shown.has('npc')
      portrait(n.look).then((t) => skin(it, t))
      made.push(it)
    })
    sp.gyms.forEach((g, i) => {
      const town = island.towns.find((t) => t.id === g.town)
      if (!town) return
      const side = g.kind === 'champion' || g.kind === 'elite4' ? i : 0
      const x = town.x + 34 + side * 8
      const z = town.z + 8 + side * 4
      const c = (TYPE_DATA as any)[g.type]?.color ?? '#ffd24a'
      const it = make('gym', g.id, island, [x, island.groundAt(x, z), z], 27, { priority: 100 - (g.kind === 'gym' || g.kind === 'kahuna' ? 0 : 30), colours: [c, '#ffffff'] })
      it.group.visible = shown.has('gym')
      portrait(g.look).then((t) => skin(it, t))
      made.push(it)
    })
    // town name pills
    island.towns.forEach((town) => {
      const { tex, ratio } = pillTexture(town.name, { size: 30, accent: town.gym ? '#ff7aa8' : '#5fe3b4' })
      const it = make('town', town.id, island, [town.x, town.y + 0.5, town.z], 12, { priority: 12, colours: ['#ffd24a'] })
      ;(it.sprite.material as SpriteMaterial).map = tex
      ;(it.sprite.material as SpriteMaterial).needsUpdate = true
      it.group.remove(it.line, it.shadow)
      it.ratio = ratio
      it.want = 1
      made.push(it)
    })
    // nobody stands on anybody: push the movers apart, towns and landmark stay put
    const movers = made.filter((it) => it.kind !== 'town')
    const fixed = island.towns.map((t) => ({ x: t.x, z: t.z, r: 20, fixed: true }))
    const pts = spread(
      [...fixed, ...movers.map((it) => ({ x: it.pos[0], z: it.pos[2], r: it.size * 0.62, clamp: (p: { x: number; z: number }) => island.keepOnLand(p.x, p.z, it.kind === 'pokemon' && it.group.userData.water) }))],
      { iterations: 160 }
    )
    movers.forEach((it, i) => {
      const p = pts[fixed.length + i]
      it.pos = [p.x, it.group.userData.water ? it.pos[1] : island.groundAt(p.x, p.z), p.z]
      it.group.position.set(it.pos[0], it.pos[1], it.pos[2])
    })
    byRegion.set(regionId, made)
  }

  const tmp = new Vector3()
  const colourOf = (it: Item) => it.colours[Math.floor(Math.random() * it.colours.length)]

  return {
    setActive(region: string | null) {
      active = region
      for (const key of [...byRegion.keys()]) if (key !== region) clear(key)
    },
    setFilters(f: Filters) {
      shown = visibleKinds(f)
      for (const it of items.values()) if (it.kind !== 'town') it.group.visible = shown.has(it.kind)
    },
    setOwned(next: Set<number>) {
      owned = next
    },
    populate(regionId: string, rolled: Record<string, number[]>, npcs: any[], gyms: any[]) {
      spawns.set(regionId, { rolled, npcs, gyms })
      build(regionId)
    },
    positionOf(kind: string, id: string, regionId?: string) {
      const pool = regionId ? (byRegion.get(regionId) ?? []) : [...items.values()]
      const it = pool.find((x) => x.kind === kind && x.id.split('@')[0] === id)
      if (!it) return null
      const w = it.group.getWorldPosition(new Vector3())
      return { island: it.island.regionId, local: it.pos, world: [w.x, w.y, w.z] as [number, number, number] }
    },
    /** The character under a screen point (a fingertip gets a generous radius). */
    pick(x: number, y: number, minRadius: number): Hit | null {
      const live = [...items.values()].filter((it) => it.island.regionId === active && it.group.visible && it.fade > 0.45 && it.want > 0)
      const i = pickNearest(live.map((it) => ({ x: it.sx, y: it.sy, r: it.px / 2, depth: it.depth })), { x, y }, minRadius)
      return i < 0 ? null : { kind: live[i].kind, id: live[i].kind === 'pokemon' ? live[i].id.split('@')[0] : live[i].id }
    },
    hover(h: Hit | null) {
      const key = h ? `${h.kind}:${h.kind === 'pokemon' ? '' : h.id}` : ''
      const it = h ? ([...items.values()].find((x) => x.kind === h.kind && (h.kind === 'pokemon' ? x.id.split('@')[0] === h.id : x.id === h.id) && x.island.regionId === active) ?? null) : null
      void key
      if (it === hovered) return
      if (hovered) hovered.hover = 0
      hovered = it
      if (it && it.kind !== 'town') {
        it.hover = 1
        it.age = 0
        if (!opts.reduced) {
          const at = it.group.getWorldPosition(tmp).clone()
          at.y += it.size * it.island.root.scale.x * 0.7
          particles.burst(at, it.kind === 'pokemon' ? it.colours : null, it.pokemonId != null && owned.has(it.pokemonId) ? 'heart' : 'star', 9, 0.9)
        }
        if (it.island.zones) {
          const z = it.id.split('@')[1]
          if (z) it.island.shake(z)
        }
      }
    },
    update(dt: number, t: number, camera: PerspectiveCamera, vw: number, vh: number) {
      frame++
      const limits = spriteLimits(vw)
      const live = active ? (byRegion.get(active) ?? []) : []
      for (const it of live) {
        it.island.root.updateWorldMatrix(true, false)
        const rs = it.island.root.scale.x
        it.group.getWorldPosition(tmp)
        const dist = camera.position.distanceTo(tmp)
        const base = it.kind === 'town' ? 12 : it.size
        const lim = it.kind === 'town' ? { minPx: 24, maxPx: 38 } : limits
        const w = spriteScale({ base: base * rs, dist, fovDeg: camera.fov, viewportH: vh, ...lim }) / rs
        const hv = it.hover
        const age = it.age
        it.age += dt
        const jump = opts.reduced || it.kind === 'town' ? 0 : hv ? Math.abs(Math.sin(age * 9)) * Math.exp(-age * 1.1) * w * 0.55 + w * 0.08 : 0
        const idle = opts.reduced || it.kind === 'town' ? 0 : Math.sin(t * 2 + it.phase) * w * 0.025
        const squash = hv && !opts.reduced ? 1 - Math.sin(age * 18) * Math.exp(-age * 4) * 0.12 : 1 + Math.sin(t * 2 + it.phase) * 0.012
        const flipX = it.kind === 'npc' && hv && !opts.reduced ? Math.cos(Math.min(age, 0.9) * 7) : 1
        const h = w * squash * (1 + hv * 0.08)
        const wd = w * it.ratio * (it.kind === 'town' ? 1 : 1) / squash * (1 + hv * 0.08)
        it.bias.value = h * rs * 0.55
        it.sprite.center.set(0.5, 0)
        it.line.center.set(0.5, 0.02)
        it.sprite.scale.set(wd * flipX, h, 1)
        const grow = 1.1 + hv * 0.1
        it.line.scale.set(wd * flipX * grow, h * grow, 1)
        it.sprite.position.y = it.line.position.y = jump + idle + (it.kind === 'town' ? w * 1.4 : 0)
        const lm = it.line.material as SpriteMaterial
        ;(lm.userData.uOutline.value as Color).set(hv ? '#ffe27a' : '#ffffff')
        it.shadow.scale.set(wd * 0.8, wd * 0.42, 1)
        ;(it.shadow.material as MeshBasicMaterial).opacity = 0.28 * (1 - Math.min(1, jump / (w * 0.7)) * 0.5)
        it.sprite.rotation.z = hv && !opts.reduced ? Math.sin(age * 14) * 0.14 * Math.exp(-age * 2) : it.kind === 'npc' ? Math.sin(t * 1.4 + it.phase) * 0.025 : 0
        if (it.aura) {
          const k = opts.reduced ? 1 : 0.7 + 0.3 * Math.sin(t * 2.4 + it.phase)
          ;(it.aura.material as SpriteMaterial).opacity = (0.3 + 0.3 * k) * it.fade
          it.aura.scale.setScalar(wd * (it.aura.userData.aura === 'pseudo' ? 1.5 : 2))
          it.aura.position.y = h * 0.5
          if (it.aura.userData.aura === 'mythical' && !opts.reduced) (it.aura.material as SpriteMaterial).color.setHSL((t * 0.2 + it.phase) % 1, 0.8, 0.7)
        }
        // screen position, for crowding and picking
        tmp.y += (h * rs) / 2 + jump * rs
        const p = tmp.clone().project(camera)
        it.sx = ((p.x + 1) / 2) * vw
        it.sy = ((1 - p.y) / 2) * vh
        it.depth = p.z
        it.px = (h * rs * vh) / (2 * dist * Math.tan((camera.fov * Math.PI) / 360))
        it.fade += (it.want - it.fade) * Math.min(1, dt * 7)
        ;(it.sprite.material as SpriteMaterial).opacity = it.fade
        lm.opacity = it.fade
      }
      // thin out whatever lands on top of something more important
      if (frame % 8 === 0 && live.length) {
        const pts = live.map((it) => ({ x: it.sx, y: it.sy, size: it.px, priority: it.priority + (it === hovered ? 1000 : 0) }))
        const keep = declutter(pts, vw < 700 ? 0.95 : 0.8, vw < 480 ? 14 : vw < 900 ? 22 : 32)
        live.forEach((it, i) => {
          const visible = it.group.visible && keep.has(i) && it.sx > -40 && it.sx < vw + 40 && it.sy > -40 && it.sy < vh + 40
          it.want = visible ? 1 : 0
          if (!it.group.visible) it.fade = 0
        })
      }
    },
    dispose() {
      alive = false
      for (const id of [...byRegion.keys()]) clear(id)
      for (const t of cache.values()) t.dispose()
      cache.clear()
      placeholder.dispose()
      glowTex.dispose()
      shadowGeo.dispose()
    },
    colourOf,
  }
}
