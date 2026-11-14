import { useState } from 'react'
import { REGIONS } from '../data/regions.mjs'
import { nextSlotDelay } from '../billboardState.mjs'
import { searchMap } from '../search.mjs'
import type { Filters } from '../scene/World'

type Hit = { kind: string; id: string; label: string; regionId: string }
const CHIPS: [keyof Filters, string, string][] = [['pokemon', 'Pokémon', '🐾'], ['npc', 'Trainer', '🧢'], ['gym', 'Gym', '🏟️']]

export default function Overlay({ region, active, onDock, filters, setFilters, onRegion, onFocus, onReset, away, ctx, now }: {
  region: string | null
  active: string
  onDock: (id: string) => void
  filters: Filters
  setFilters: (f: Filters) => void
  onRegion: (id: string | null) => void
  onFocus: (hit: Hit) => void
  onReset: () => void
  away: boolean
  ctx: Parameters<typeof searchMap>[1]
  now: number
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const hits = searchMap(q, ctx) as Hit[]
  const left = Math.ceil(nextSlotDelay(now || Date.now()) / 1000)
  const current = REGIONS.find((r: any) => r.id === (region ?? active))
  return (
    <>
      <header className="mp-top">
        {region && (
          <button type="button" className="mp-btn mp-round" onClick={() => onRegion(null)} aria-label="Về toàn cảnh">
            ‹
          </button>
        )}
        <div className="mp-title">
          <h1>{current?.name ?? 'Quần đảo Pokémon'}</h1>
          {now > 0 && <p>Lượt mới sau {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</p>}
        </div>
        <button type="button" className="mp-btn mp-round" aria-label="Tìm kiếm" aria-expanded={open} onClick={() => setOpen(!open)}>
          🔍
        </button>
      </header>
      {open && (
        <div className="mp-search" role="search">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm vùng, gym, trainer, Pokémon" aria-label="Tìm trên bản đồ" />
          {hits.length > 0 && (
            <ul>
              {hits.map((h) => (
                <li key={h.kind + h.id}>
                  <button type="button" onClick={() => { setQ(''); setOpen(false); onFocus(h) }}>
                    <b>{({ region: 'Vùng', gym: 'Gym', npc: 'Trainer', pokemon: 'Pokémon' } as any)[h.kind]}</b> {h.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="mp-side" role="group" aria-label="Lọc">
        {CHIPS.map(([k, label, icon]) => (
          <button type="button" className="mp-btn mp-round" key={k} aria-pressed={filters[k]} aria-label={label} title={label} onClick={() => setFilters({ ...filters, [k]: !filters[k] })}>
            <span aria-hidden>{icon}</span>
          </button>
        ))}
        {away && (
          <button type="button" className="mp-btn mp-round mp-reset" aria-label="Về góc nhìn gốc" title="Về góc nhìn gốc (phím 0)" onClick={onReset}>
            ⟲
          </button>
        )}
      </div>
      {!region && (
        <button type="button" className="mp-enter" onClick={() => onRegion(active)}>
          Khám phá {current?.name}
        </button>
      )}
      <nav className="mp-dock" aria-label="Chọn vùng">
        {REGIONS.map((r: any) => (
          <button type="button" key={r.id} aria-current={(region ?? active) === r.id || undefined} style={{ ['--c' as string]: r.palette.glow, ['--g' as string]: r.palette.grass }} onClick={() => onDock(r.id)}>
            <i aria-hidden />
            <span>{r.name}</span>
          </button>
        ))}
      </nav>
    </>
  )
}
