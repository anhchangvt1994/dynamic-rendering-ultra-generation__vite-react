// The games the platform lists. Each brings its Board (props: difficulty,
// view, flip, disabled, tone) and, in its own folder, its rules.
import Board from './memory/Board'

export const GAMES = [
  {
    id: 'memory',
    title: 'Lật thẻ tìm cặp',
    blurb: 'Nhớ vị trí các thẻ Pokémon và ghép đủ cặp trước khi hết 5 phút.',
    Board,
  },
]
