import { itemSprite } from 'pages/QuizPage/items.mjs'
import { MINIGAME } from '../minigame.mjs'
import TicketRow from './TicketRow'

const BERRIES = ['cheri-berry', 'oran-berry', 'pecha-berry']
const CARDS = [
  ['#ff6b8a', '-8deg'],
  ['#5fe3b4', '0deg'],
  ['#ffcf5a', '8deg'],
]

type Game = { id: string; title: string; blurb: string }
type Props = {
  game: Game
  index: number
  server: boolean
  left: number | null
  resetText: string
  open: boolean
  onPlay: () => void
}

/** One game box on the felt: art, name, rule, tickets and the play button. */
export default function Booth({ game, index, server, left, resetText, open, onPlay }: Props) {
  const total = MINIGAME.TURNS
  const n = left ?? total
  const label = !server
    ? 'Chơi thử, không mất lượt'
    : n > 0
      ? `Còn ${n}/${total} lượt`
      : `Hết lượt${resetText ? `, thêm sau ${resetText}` : ''}`
  return (
    <article data-region="booth" style={{ ['--n' as string]: 2 + index }}>
      <div className="bx" data-open={open || undefined}>
        <div className="bx-art" aria-hidden="true">
          <span className="bx-lid" />
          <div className="bx-things">
            {game.id === 'candy'
              ? BERRIES.map((b) => <img key={b} src={itemSprite(b)} alt="" draggable={false} />)
              : CARDS.map(([c, r]) => <span key={c} className="bx-card" style={{ ['--c' as string]: c, ['--r' as string]: r }} />)}
          </div>
        </div>
        <h2>{game.title}</h2>
        <p className="bx-rule">{game.blurb}</p>
        <TicketRow left={server ? n : total} total={total} label={label} />
        <button type="button" className="mgp-play hub-booth-btn" onClick={onPlay}>
          Chơi
        </button>
      </div>
    </article>
  )
}
