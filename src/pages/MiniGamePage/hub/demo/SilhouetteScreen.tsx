import { getPokemonImage } from 'pages/PokemonPage/navigation.mjs'
import { tileStyle } from '../../games/silhouette-atelier/board-model.mjs'
import { isLocked } from '../../games/silhouette-atelier/engine.mjs'
import { JIGSAW_DEMO, jigsawFrames } from './jigsawDemo.mjs'
import { useDemoClock } from './useDemoClock'

const { cols, rows, art } = JIGSAW_DEMO
const FRAMES = jigsawFrames()
const url = `url(${getPokemonImage(art)})`

/** Attract demo of Ghép mảnh: pieces leave the tray, turn upright and lock into the frame. Decorative. */
export default function SilhouetteScreen({ active }: { active: boolean }) {
  const step = useDemoClock(FRAMES.length + 3, 560, active)
  const { state } = FRAMES[Math.min(step, FRAMES.length - 1)]
  const solved = step >= FRAMES.length - 1
  const turn = (i: number) => `rotate(${state.rot[i] * 90}deg)`
  const pieceAt = (cell: number) => state.at.indexOf(cell)
  return (
    <div className="ss" aria-hidden="true" data-solved={solved || undefined}>
      <div className="ss-frame">
        {Array.from({ length: cols * rows }, (_, cell) => {
          const i = pieceAt(cell)
          return (
            <span key={cell} className="ss-slot">
              {i >= 0 && <i className="ss-piece" data-locked={isLocked(state, i) || undefined} style={{ backgroundImage: url, ...tileStyle(i, cols, rows), transform: turn(i) }} />}
            </span>
          )
        })}
      </div>
      <div className="ss-tray">
        {state.at.map((cell: number, i: number) => cell < 0 && <i key={i} style={{ backgroundImage: url, ...tileStyle(i, cols, rows), transform: turn(i) }} />)}
      </div>
    </div>
  )
}
