import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getCaught, subscribeCaught } from 'utils/caught.mjs'
import { useSpeciesNames } from 'pages/MiniGamePage/useSpeciesNames'
import { GYMS } from './data/gyms.mjs'
import { REGIONS } from './data/regions.mjs'
import { slotOf } from './spawn.mjs'
import { mapData } from './mapData.mjs'
import { MapStyle } from './styles'
import FallbackList from './ui/FallbackList'
import InfoCard, { describe } from './ui/InfoCard'
import type { Picked } from './ui/InfoCard'
import Overlay from './ui/Overlay'
import type { Filters, HoverInfo, World } from './scene/World'

const gymCount = (id: string) => GYMS.filter((g: any) => g.region === id && (g.kind === 'gym' || g.kind === 'kahuna')).length

function Tip({ tip, owned, nameOf, npcs, pokemon }: { tip: HoverInfo; owned: Set<number>; nameOf: (id: number) => string; npcs: any[]; pokemon: { regionId: string }[] }) {
  let title = ''
  let sub = ''
  let colour = '#ffd24a'
  if (tip.hit.kind === 'island') {
    const r = REGIONS.find((x: any) => x.id === tip.hit.id)
    if (!r) return null
    title = r.name
    sub = `${gymCount(r.id)} gym · ${pokemon.filter((p) => p.regionId === r.id).length} Pokémon`
    colour = r.palette.glow
  } else {
    const d = describe(tip.hit as any, owned, nameOf, npcs)
    title = d.title
    sub = d.sub
    colour = d.colour
  }
  const w = typeof window === 'undefined' ? 360 : window.innerWidth
  const x = Math.min(Math.max(tip.x, 110), w - 110)
  return (
    <div className="mp-tip" style={{ left: x, top: Math.max(tip.y - 64, 70), ['--c' as string]: colour }}>
      <strong>{title}</strong>
      <span>{sub}</span>
    </div>
  )
}

/** The floating islands: public, but drawn on the device, so never indexed. */
export default function MapPage() {
  setSeoTag({
    title: 'Bản đồ Pokémon | Pokédex',
    description: 'Khám phá 9 vùng Pokémon trên những hòn đảo nổi.',
    robots: 'noindex, nofollow',
  })
  const canvas = useRef<HTMLCanvasElement>(null)
  const world = useRef<World | null>(null)
  const nameOf = useSpeciesNames()
  const [owned, setOwned] = useState<Set<number>>(() => getCaught())
  const [region, setRegion] = useState<string | null>(null)
  const [active, setActive] = useState('kanto')
  const [filters, setFilters] = useState<Filters>({ pokemon: true, npc: true, gym: true })
  const [picked, setPicked] = useState<Picked | null>(null)
  const [ready, setReady] = useState(false)
  const [flat, setFlat] = useState(false)
  const [away, setAway] = useState(false)
  const [tip, setTip] = useState<HoverInfo | null>(null)
  const [now, setNow] = useState(0)
  const regionRef = useRef(region)
  regionRef.current = region
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => subscribeCaught(() => setOwned(getCaught())), [])
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const slot = slotOf(now || Date.now())
  const data = useMemo(() => mapData(slot, owned), [slot, owned])

  const ctx = useMemo(() => ({ regions: REGIONS, gyms: data.gyms, npcs: data.npcs, pokemon: data.pokemon, speciesName: nameOf }), [data, nameOf])
  const closeCard = useCallback(() => setPicked(null), [])

  const goRegion = useCallback((id: string | null) => {
    setRegion(id)
    setPicked(null)
    if (id) setActive(id)
    world.current?.setRegion(id)
  }, [])
  // the dock slides to an island; a second tap on the one in the middle flies in
  const dock = useCallback(
    (id: string) => {
      if (regionRef.current || activeRef.current === id) return goRegion(id)
      world.current?.setActive(id)
    },
    [goRegion]
  )

  useEffect(() => {
    const el = canvas.current
    if (!el) return
    let alive = true
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    import('./scene/World')
      .then(({ createWorld, webglOk }) => {
        if (!alive) return
        if (!webglOk()) return setFlat(true)
        try {
          const w = createWorld({
            canvas: el,
            reduced,
            dprMax: window.innerWidth < 700 ? 1.6 : 2,
            onPick: (hit) => {
              if (hit.kind === 'island') {
                if (!regionRef.current) goRegion(hit.id)
                return
              }
              if (hit.kind === 'town') return
              setPicked({ kind: hit.kind, id: hit.id })
            },
            onHover: setTip,
            onMoved: setAway,
            onActive: setActive,
            onLost: () => {
              world.current?.dispose()
              world.current = null
              if (alive) setFlat(true)
            },
          })
          world.current = w
          w.setOwned(getCaught())
          setReady(true)
        } catch {
          setFlat(true)
        }
      })
      .catch(() => alive && setFlat(true))
    return () => {
      alive = false
      world.current?.dispose()
      world.current = null
    }
  }, [goRegion])

  useEffect(() => world.current?.setOwned(owned), [owned, ready])
  useEffect(() => world.current?.setFilters(filters), [filters, ready])

  const focus = (hit: { kind: string; id: string; regionId: string }) => {
    if (hit.kind === 'region') return goRegion(hit.id)
    if (regionRef.current !== hit.regionId) goRegion(hit.regionId)
    world.current?.focus(hit.kind, hit.id, hit.regionId)
    setPicked({ kind: hit.kind as Picked['kind'], id: hit.id })
  }

  return (
    <MapStyle>
      {!flat && <canvas ref={canvas} className="mp-canvas" aria-label="Các hòn đảo Pokémon" />}
      {flat && <FallbackList pokemon={data.pokemon} nameOf={nameOf} onPick={(kind, id) => setPicked({ kind: kind as Picked['kind'], id })} />}
      <Overlay
        region={region}
        active={active}
        onDock={dock}
        filters={filters}
        setFilters={setFilters}
        onRegion={goRegion}
        onFocus={focus}
        onReset={() => world.current?.resetView()}
        away={away}
        now={now}
        ctx={ctx}
      />
      {tip && !picked && <Tip tip={tip} owned={owned} nameOf={nameOf} npcs={data.npcs} pokemon={data.pokemon} />}
      {picked && <InfoCard picked={picked} owned={owned} nameOf={nameOf} npcs={data.npcs} onClose={closeCard} />}
      {!flat && (
        <div className="mp-veil" data-gone={ready || undefined}>
          <div />
        </div>
      )}
    </MapStyle>
  )
}
