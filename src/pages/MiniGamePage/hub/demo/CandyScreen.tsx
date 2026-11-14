import { useMemo } from 'react'
import { itemSprite } from 'pages/QuizPage/items.mjs'
import vectors from '../../games/candy/vectors.json'
import { candyFrames } from './candyDemo.mjs'
import { useDemoClock } from './useDemoClock'

const ITEMS = ['cheri-berry', 'oran-berry', 'pecha-berry', 'rawst-berry']
const WIN = (vectors as unknown as { name: string; board0: number[]; tape: number[]; pos0: number; moves: [number, number][]; kinds: number }[]).find((v) => v.name === 'win')!
const COLS = 6
const ROWS = 7
const WORDS = ['', 'Ngọt lịm!', 'Ngon tuyệt!', 'Thần sầu!', 'HUYỀN THOẠI!']
const tierOf = (gain: number) => (gain >= 240 ? 4 : gain >= 120 ? 3 : gain >= 60 ? 2 : gain >= 30 ? 1 : 0)

/** Attract demo: the engine's own 'win' run. Each move = swap wiggle, then burst + gain + callout. Decorative. */
export default function CandyScreen({ active }: { active: boolean }) {
  const frames = useMemo(
    () => candyFrames({ board: WIN.board0, tape: WIN.tape, pos: WIN.pos0, moves: WIN.moves, kinds: WIN.kinds }),
    [],
  )
  const step = useDemoClock((frames.length - 1) * 2, 1150, active)
  const m = Math.min(frames.length - 1, Math.floor(step / 2) + 1)
  const result = step % 2 === 1
  const prev = frames[m - 1]
  const f = result ? frames[m] : prev
  const gain = frames[m].score - prev.score
  const tier = result ? tierOf(gain) : 0
  const changed = (c: number) => result && prev.board[c] !== f.board[c]
  const at = frames[m].swap ? frames[m].swap![1] : 0
  return (
    <div className="cs" aria-hidden="true" data-tier={tier}>
      <div className="cs-hud">
        <span>Điểm</span>
        <b key={`${m}-${result}`}>{f.score}</b>
      </div>
      <div className="cs-grid">
        {f.board.map((k, c) => (
          <i key={`${step}-${c}`} className="cs-cell" data-new={changed(c) || undefined} data-swap={(!result && frames[m].swap?.includes(c)) || undefined}>
            <img src={itemSprite(ITEMS[k] ?? ITEMS[0])} alt="" draggable={false} />
            {changed(c) && (
              <span className="cs-fx">
                <u />
                {Array.from({ length: 6 }, (_, j) => (
                  <b key={j} style={{ ['--a' as string]: `${j * 60 + (c % 5) * 11}deg` }} />
                ))}
              </span>
            )}
          </i>
        ))}
        {result && gain > 0 && (
          <span key={`g${step}`} className="cs-gain" style={{ left: `${((at % COLS) + 0.5) * (100 / COLS)}%`, top: `${(Math.floor(at / COLS) + 0.5) * (100 / ROWS)}%` }}>
            +{gain}
          </span>
        )}
        {tier > 0 && (
          <strong key={`c${step}`} className="cs-call" data-tier={tier}>
            {WORDS[tier]}
          </strong>
        )}
      </div>
    </div>
  )
}
