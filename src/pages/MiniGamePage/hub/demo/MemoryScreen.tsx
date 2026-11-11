import { getPokemonImage } from 'pages/PokemonPage/navigation.mjs'
import { MEMORY_DEMO } from './memoryDemo.mjs'
import { useDemoClock } from './useDemoClock'

const { cards, flips } = MEMORY_DEMO

/** Attract demo: pairs flip one by one, matches stay up and glow. Decorative. */
export default function MemoryScreen({ active }: { active: boolean }) {
  const step = useDemoClock(flips.length + 2, 900, active)
  const done = step > flips.length
  const shown = step >= 1 && step <= flips.length ? flips[step - 1] : []
  const matched = new Set<number>()
  const upTo = done ? flips.length : Math.max(0, step - 1)
  for (let s = 0; s < upTo; s += 1) {
    const [a, b] = flips[s]
    if (cards[a] === cards[b]) matched.add(a).add(b)
  }
  if (shown.length === 2 && cards[shown[0]] === cards[shown[1]]) shown.forEach((x) => matched.add(x))
  return (
    <div className="ms" aria-hidden="true">
      {cards.map((face, i) => {
        const up = matched.has(i) || shown.includes(i)
        return (
          <i key={i} className="ms-card" data-up={up || undefined} data-match={matched.has(i) || undefined}>
            <span className="ms-in">
              <span className="ms-back" />
              <span className="ms-face">
                <img src={getPokemonImage(face)} alt="" draggable={false} />
              </span>
            </span>
          </i>
        )
      })}
    </div>
  )
}
