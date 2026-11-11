import { useMemo } from 'react'
import { itemSprite } from 'pages/QuizPage/items.mjs'
import vectors from '../../games/candy/vectors.json'
import { candyFrames } from './candyDemo.mjs'
import { useDemoClock } from './useDemoClock'

const ITEMS = ['cheri-berry', 'oran-berry', 'pecha-berry', 'rawst-berry']
const WIN = (vectors as unknown as { name: string; board0: number[]; tape: number[]; pos0: number; moves: [number, number][]; kinds: number }[]).find((v) => v.name === 'win')!

/** Attract demo: the engine's own 'win' run, one settled board per tick. Decorative. */
export default function CandyScreen({ active }: { active: boolean }) {
  const frames = useMemo(
    () => candyFrames({ board: WIN.board0, tape: WIN.tape, pos: WIN.pos0, moves: WIN.moves, kinds: WIN.kinds }),
    [],
  )
  const i = useDemoClock(frames.length, 2300, active)
  const f = frames[i]
  const prev = i > 0 ? frames[i - 1] : null
  return (
    <div className="cs" aria-hidden="true">
      <div className="cs-hud">
        <span>Điểm</span>
        <b key={i}>{f.score}</b>
      </div>
      <div className="cs-grid">
        {f.board.map((k, c) => {
          const fresh = prev ? prev.board[c] !== k : false
          const swap = f.swap?.includes(c)
          return (
            <i key={`${i}-${c}`} className="cs-cell" data-new={fresh || undefined} data-swap={swap || undefined}>
              <img src={itemSprite(ITEMS[k] ?? ITEMS[0])} alt="" draggable={false} />
            </i>
          )
        })}
      </div>
    </div>
  )
}
