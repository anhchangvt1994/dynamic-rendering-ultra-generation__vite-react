import type { CSSProperties } from 'react'
import { getPokemonImage } from 'pages/PokemonPage/navigation.mjs'
import { SPIN } from '../../games/lucky-spin/rules.mjs'
import { spinFrames } from './spinDemo.mjs'
import { useDemoClock } from './useDemoClock'

const FRAMES = spinFrames()
const { COLS, ROWS, SPECIES } = SPIN

/** Attract demo of Vòng quay: 3 rows x 5 reels, 3 spins, winning runs light up, combo and score climb. Decorative. */
export default function SpinScreen({ active }: { active: boolean }) {
  const step = useDemoClock(FRAMES.length + 2, 520, active)
  const f = FRAMES[Math.min(step, FRAMES.length - 1)]
  const landed = f.stopped === COLS && f.lines.length > 0
  const lit = new Set<number>()
  f.lines.forEach((l: { row: number; start: number; len: number }) => {
    for (let k = 0; k < l.len; k += 1) lit.add(l.row * COLS + l.start + k)
  })
  return (
    <div className="ls" aria-hidden="true" data-win={landed || undefined} data-swept={(landed && f.swept) || undefined}>
      <div className="ls-reels">
        {Array.from({ length: COLS * ROWS }, (_, i) => {
          const c = i % COLS
          const spinning = f.stopped < COLS && c >= f.stopped && step > 0 && step < FRAMES.length
          const sym = spinning ? (i * 2 + step) % SPECIES.length : f.grid[i]
          return (
            <i key={i} data-spin={spinning || undefined} data-lit={lit.has(i) || undefined} style={{ '--c': c } as CSSProperties}>
              <img src={getPokemonImage(SPECIES[sym])} alt="" draggable={false} />
            </i>
          )
        })}
      </div>
    </div>
  )
}
