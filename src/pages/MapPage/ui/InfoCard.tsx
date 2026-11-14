import { useEffect, useRef } from 'react'
import { TYPE_DATA } from 'components/pokemon-page/type-data.mjs'
import { typesOf } from 'components/pokemon-page/type-index.mjs'
import { GYMS } from '../data/gyms.mjs'
import { REGIONS } from '../data/regions.mjs'
import { CLASSES } from '../npc.mjs'
import { tierOf } from '../tiers.mjs'
import { getPokemonSprite } from 'pages/PokemonPage/navigation.mjs'

export type Picked = { kind: 'pokemon' | 'npc' | 'gym'; id: string }
const TIER: Record<string, string> = { common: 'Phổ biến', uncommon: 'Ít gặp', rare: 'Hiếm', veryRare: 'Rất hiếm', pseudo: 'Bán thần', legendary: 'Huyền thoại', mythical: 'Thần thoại' }
const KIND: Record<string, string> = { gym: 'Thủ lĩnh gym', kahuna: 'Kahuna', elite4: 'Tứ Thiên Vương', champion: 'Nhà vô địch' }
const type = (t: string) => (TYPE_DATA as any)[t]

/** Name, kind and colour of anything on the map (the card and the hover bubble share it). */
export function describe(picked: Picked, owned: Set<number>, nameOf: (id: number) => string, npcs: { id: string; name: string; cls: string; regionId: string }[]) {
  let title = ''
  let sub = ''
  let colour = '#ffd24a'
  let art: string | null = null
  const tags: string[] = []
  if (picked.kind === 'pokemon') {
    const id = Number(picked.id)
    const types = typesOf(id) as string[]
    title = nameOf(id)
    sub = `#${String(id).padStart(4, '0')} · ${TIER[tierOf(id)]}`
    colour = type(types[0])?.color ?? colour
    art = getPokemonSprite(id)
    tags.push(...types.map((t) => type(t)?.label ?? t), owned.has(id) ? 'Đã có' : 'Chưa có')
  } else if (picked.kind === 'gym') {
    const g = GYMS.find((x: any) => x.id === picked.id)
    if (g) {
      title = g.leader
      sub = `${KIND[g.kind]} · ${REGIONS.find((r: any) => r.id === g.region)?.name}`
      colour = type(g.type)?.color ?? colour
      tags.push(`Hệ ${type(g.type)?.label ?? g.type}`)
      if (g.badge) tags.push(`Huy hiệu ${g.badge}`)
    }
  } else {
    const n = npcs.find((x) => x.id === picked.id)
    if (n) {
      title = n.name
      sub = `${CLASSES.find((c: any) => c.id === n.cls)?.name ?? 'Trainer'} · ${REGIONS.find((r: any) => r.id === n.regionId)?.name}`
      colour = '#7ac8ff'
    }
  }
  return { title, sub, colour, art, tags }
}

/** A bottom sheet: a tap on a character opens it; swipe it down, press Esc or tap × to close. */
export default function InfoCard({ picked, owned, nameOf, npcs, onClose }: {
  picked: Picked
  owned: Set<number>
  nameOf: (id: number) => string
  npcs: { id: string; name: string; cls: string; regionId: string }[]
  onClose: () => void
}) {
  const d = describe(picked, owned, nameOf, npcs)
  const ref = useRef<HTMLElement>(null)
  const y0 = useRef<number | null>(null)
  const close = useRef(onClose)
  close.current = onClose
  // focus once per card, without scrolling the clipped stage (that was the jolt)
  useEffect(() => {
    ref.current?.focus({ preventScroll: true })
    const k = (e: KeyboardEvent) => e.key === 'Escape' && close.current()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [picked.kind, picked.id])
  return (
    <aside
      ref={ref}
      tabIndex={-1}
      className="mp-card"
      style={{ ['--c' as string]: d.colour }}
      role="dialog"
      aria-label={d.title}
      onPointerDown={(e) => (y0.current = e.clientY)}
      onPointerUp={(e) => {
        if (y0.current != null && e.clientY - y0.current > 60) onClose()
        y0.current = null
      }}
    >
      <span className="mp-grip" aria-hidden />
      {d.art && <img src={d.art} alt="" width={72} height={72} draggable={false} />}
      <div className="mp-card-text">
        <strong>{d.title}</strong>
        <span>{d.sub}</span>
        <p>{d.tags.map((t) => <i key={t}>{t}</i>)}</p>
        <em>Sắp có thêm</em>
      </div>
      <button type="button" className="mp-x" aria-label="Đóng" onClick={onClose}>×</button>
    </aside>
  )
}
