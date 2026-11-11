import { useEffect, useMemo, useState } from 'react'
import IndividualArt from 'pages/BagPage/individuals/IndividualArt'
import type { Individual } from 'pages/BagPage/individuals/client'
import { bondOf, slotsFor } from '../minigame.mjs'
import { useSpeciesNames } from '../useSpeciesNames'
import { teamCandidates } from './teamView.mjs'

type Props = {
  individuals: Individual[]
  trainer: { level: number; team: string[] }
  cares: Record<string, { affection: number }>
  loadBuild: (id: string) => Promise<{ level: number }>
  onSave: (ids: string[]) => Promise<void>
  onDone: () => void
}

/** Pick up to the trainer's slots; a Pokémon too strong for now is dimmed with why. */
export default function TeamPicker({ individuals, trainer, cares, loadBuild, onSave, onDone }: Props) {
  const nameOf = useSpeciesNames()
  const slots = slotsFor(trainer.level)
  const [team, setTeam] = useState<string[]>(trainer.team)
  const [levels, setLevels] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    for (const item of individuals)
      loadBuild(item.id).then(
        (b) => live && setLevels((prev) => ({ ...prev, [item.id]: b.level })),
        () => {}
      )
    return () => {
      live = false
    }
  }, [individuals, loadBuild])

  const rows = useMemo(
    () =>
      teamCandidates({
        individuals,
        trainerLevel: trainer.level,
        builds: Object.fromEntries(
          individuals.map((i) => [
            i.id,
            { level: levels[i.id] ?? 1, bond: bondOf(cares[i.id]?.affection ?? 0) },
          ])
        ),
      }),
    [individuals, levels, cares, trainer.level]
  )
  const toggle = (id: string) =>
    setTeam((t) => (t.includes(id) ? t.filter((x) => x !== id) : t.length < slots ? [...t, id] : t))

  return (
    <>
      <p className="mg-sub">
        Đội hình {team.length}/{slots} ô. Thêm ô mới mỗi 5 level trainer.
      </p>
      <ul className="mg-list">
        {rows.map(({ individual, ok, reason }) => {
          const on = team.includes(individual.id)
          const blocked = !ok && !on
          return (
            <li key={individual.id}>
              <button
                type="button"
                className="mg-pick"
                aria-pressed={on}
                aria-disabled={blocked || undefined}
                style={blocked ? { opacity: 0.5 } : undefined}
                onClick={() => (blocked ? setError(`${individual.nickname ?? nameOf(individual.speciesId)}: ${reason}.`) : toggle(individual.id))}
              >
                <IndividualArt speciesId={individual.speciesId} name={nameOf(individual.speciesId)} size={56} />
                <span>
                  <b>{individual.nickname ?? nameOf(individual.speciesId)}</b>
                  <span className="mg-meta">
                    <span>Lv {levels[individual.id] ?? '…'}</span>
                    <span>Thân thiết {bondOf(cares[individual.id]?.affection ?? 0)}</span>
                    {on && <span>Trong đội</span>}
                  </span>
                  {blocked && <span className="mg-why" style={{ display: 'block' }}>{reason}</span>}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {error && (
        <p className="mg-error" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        className="mg-cta"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          setError(null)
          try {
            await onSave(team)
            onDone()
          } catch (e: any) {
            setError(e?.message ?? 'Không lưu được đội hình.')
          } finally {
            setBusy(false)
          }
        }}
      >
        Lưu đội hình
      </button>
    </>
  )
}
