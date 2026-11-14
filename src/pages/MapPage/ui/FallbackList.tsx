import { GYMS } from '../data/gyms.mjs'
import { REGIONS } from '../data/regions.mjs'

/** The map without WebGL: every region with its gyms and the Pokémon out now. */
export default function FallbackList({
  pokemon,
  nameOf,
  onPick,
}: {
  pokemon: { id: number; zone?: string; regionId: string }[]
  nameOf: (id: number) => string
  onPick: (kind: string, id: string) => void
}) {
  return (
    <div className="mp-fallback">
      <p className="mp-note">Thiết bị này chưa hiển thị được bản đồ 3D. Đây là danh sách các vùng.</p>
      {REGIONS.map((r) => (
        <section key={r.id} style={{ ['--c' as string]: r.palette.glow }}>
          <h3>{r.name}</h3>
          <ul>
            {GYMS.filter((g) => g.region === r.id && (g.kind === 'gym' || g.kind === 'kahuna')).map((g) => (
              <li key={g.id}>
                <button type="button" onClick={() => onPick('gym', g.id)}>
                  {g.leader}
                </button>
              </li>
            ))}
          </ul>
          <p>
            {pokemon
              .filter((p) => p.regionId === r.id)
              .slice(0, 12)
              .map((p) => (
                <button type="button" key={`${p.zone}-${p.id}`} onClick={() => onPick('pokemon', String(p.id))}>
                  {nameOf(p.id)}
                </button>
              ))}
          </p>
        </section>
      ))}
    </div>
  )
}
