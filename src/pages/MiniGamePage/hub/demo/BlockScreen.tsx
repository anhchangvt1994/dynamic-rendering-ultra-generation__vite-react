import { useMemo } from 'react'
import { getPokemonImage } from 'pages/PokemonPage/navigation.mjs'
import { COMPANION, ROWS, TOP, blockFrames } from './blockDemo.mjs'
import { speciesFor } from '../../games/block-lab/skins.mjs'
import { useDemoClock } from './useDemoClock'

const COLORS = ['#38d8ff', '#ffd23f', '#b57bff', '#4ddc7c', '#ff5d5d', '#5b8cff', '#ff9a3d']
const FIREWORK = [18, 55, 118, 200, 285, 330, 70, 250, 150]

/** Attract demo of Xếp khối: a bot plays the real engine with mixed pieces; shards on landing, sweep + callout on a clear. Decorative. */
export default function BlockScreen({ active }: { active: boolean }) {
  const frames = useMemo(() => blockFrames(), [])
  const i = useDemoClock(frames.length + 2, 300, active)
  const f = frames[Math.min(i, frames.length - 1)]
  const call = f.rows.length ? ['', 'Gọn!', 'Đôi!', 'Ba hàng!', 'TETRIS!'][f.rows.length] : ''
  const hoverSkin = speciesFor(COMPANION, frames.slice(0, i).filter((x: any) => x.fresh.length).length)
  return (
    <div className="bs" aria-hidden="true">
      <div className="bs-field">
        <div className="bs-grid">
          {Array.from({ length: ROWS * 10 }, (_, k) => {
            const c = k + TOP * 10
            const filled = f.cells[c]
            const hovering = f.hover.includes(c)
            const type = filled ? filled - 1 : hovering ? f.type : undefined
            const fresh = f.fresh.includes(c)
            const mon = filled ? f.skins[c] : hovering ? hoverSkin : 0
            return (
              <i key={`${i}-${k}`} className="bs-cell" data-on={type !== undefined || undefined} data-new={fresh || undefined} style={{ ['--c' as string]: COLORS[type ?? 0] }}>
                {mon ? <img src={getPokemonImage(mon)} alt="" draggable={false} /> : null}
                {fresh && (
                  <span className="bs-fx">
                    {Array.from({ length: 4 }, (_, j) => <b key={j} style={{ ['--a' as string]: `${j * 90 + (c % 7) * 9}deg` }} />)}
                  </span>
                )}
              </i>
            )
          })}
        </div>
        {f.rows.map((r: number) => <u key={`${i}-s${r}`} className="bs-sweep" style={{ top: `${((r - TOP) / ROWS) * 100}%`, height: `${100 / ROWS}%` }} />)}
        {f.rows.length > 0 && FIREWORK.slice(0, f.rows.length * 2 + 1).map((x, k) => (
          <em key={`${i}-f${k}`} className="bs-spark" style={{ left: `${x % 100}%`, top: `${((f.rows[0] - TOP) / ROWS) * 100}%`, ['--h' as string]: `${(k * 61 + 20) % 360}` }} />
        ))}
        {call && <strong key={`${i}-c`} className="bs-call">{call}</strong>}
      </div>
    </div>
  )
}
