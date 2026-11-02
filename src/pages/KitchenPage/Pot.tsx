import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import {
  FLAVORS,
  FLAVOR_INFO,
  INGREDIENTS,
  itemById,
  itemSprite,
} from 'pages/QuizPage/items.mjs'
import Flavors from 'pages/QuizPage/Flavors'
import { recipeKey } from './kitchen.mjs'

type Flavor = keyof typeof FLAVOR_INFO
export const POT_SIZE = 4

/** The pot's flavours: each flavour's potencies summed. */
export function potFlavors(pot: string[]) {
  const sums: Record<Flavor, number> = {
    spicy: 0,
    dry: 0,
    sweet: 0,
    bitter: 0,
    sour: 0,
  }
  for (const id of pot)
    for (const [flavor, potency] of Object.entries(
      FLAVORS[id as keyof typeof FLAVORS] ?? {}
    ))
      sums[flavor as Flavor] += potency as number
  return sums
}

type Props = {
  bag: Record<string, number>
  pot: string[]
  /** pots that failed before, each sorted */
  attempts: string[][]
  onAdd: (id: string) => void
  onRemove: (index: number) => void
  onClear: () => void
  /** the cook button, or the invitation to sign in */
  action: ReactNode
}

/**
 * Free cooking: ingredient jars (what is left, its flavours), a pot of 4
 * slots, the pot's flavour meter and a warning for a pot that failed before.
 */
export default function Pot({
  bag,
  pot,
  attempts,
  onAdd,
  onRemove,
  onClear,
  action,
}: Props) {
  const inPot = (id: string) => pot.filter((x) => x === id).length
  // what the bag has first; the order is kept while the tab is open, so a
  // jar that runs out stays where it is (no shelf jumping under the finger)
  const [jars] = useState(() =>
    [...INGREDIENTS].sort(
      (a, b) => Number((bag[b] ?? 0) > 0) - Number((bag[a] ?? 0) > 0)
    )
  )
  const sums = potFlavors(pot)
  const max = Math.max(40, ...Object.values(sums))
  const tried =
    pot.length >= 2 && attempts.some((a) => a.join('+') === recipeKey(pot))

  return (
    <div className="pot-area">
      <ul className="shelf" aria-label="Kệ nguyên liệu">
        {jars.map((id) => {
          const left = (bag[id] ?? 0) - inPot(id)
          const item = itemById(id)
          return (
            <li key={id}>
              <button
                type="button"
                className="jar"
                data-item={id}
                data-empty={left <= 0 || undefined}
                disabled={left <= 0 || pot.length >= POT_SIZE}
                onClick={() => onAdd(id)}
                aria-label={`Bỏ ${item.name} vào nồi (còn ${Math.max(0, left)})`}
              >
                <img
                  src={itemSprite(id)}
                  alt=""
                  width={30}
                  height={30}
                  loading="lazy"
                />
                <span className="jar-name">{item.name}</span>
                <b className="jar-count">{`×${Math.max(0, left)}`}</b>
                <Flavors id={id} className="jar-flavors" />
              </button>
            </li>
          )
        })}
      </ul>

      <section className="pot-bar" aria-label="Nồi">
        <ol className="pot-slots">
          {Array.from({ length: POT_SIZE }, (_, index) => {
            const id = pot[index]
            return (
              <li key={index}>
                {id ? (
                  <button
                    type="button"
                    className="slot"
                    onClick={() => onRemove(index)}
                    aria-label={`Lấy ${itemById(id).name} ra`}
                  >
                    <img src={itemSprite(id)} alt="" width={30} height={30} />
                  </button>
                ) : (
                  <span className="slot" data-empty="">
                    <span className="sr-only">Ô trống</span>
                  </span>
                )}
              </li>
            )
          })}
        </ol>
        <dl className="flavor-meter">
          {(Object.keys(FLAVOR_INFO) as Flavor[]).map((flavor) => (
            <div
              key={flavor}
              data-flavor={flavor}
              data-value={sums[flavor]}
              style={
                {
                  '--c': FLAVOR_INFO[flavor].color,
                  '--v': sums[flavor] / max,
                } as CSSProperties
              }
            >
              <dt>{FLAVOR_INFO[flavor].label}</dt>
              <dd>
                <i />
              </dd>
            </div>
          ))}
        </dl>
        {tried && (
          <p className="pot-warning" role="status">
            Tổ hợp này đã hỏng lần trước rồi!
          </p>
        )}
        <div className="pot-actions">
          <button
            type="button"
            className="pot-clear"
            onClick={onClear}
            disabled={!pot.length}
          >
            Đổ ra
          </button>
          {action}
        </div>
      </section>
    </div>
  )
}
