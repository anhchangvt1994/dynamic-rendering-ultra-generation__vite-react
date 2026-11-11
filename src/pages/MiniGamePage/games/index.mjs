// The games the platform lists. Each brings its Board and, in its own
// folder, its rules. `levelInfo` and `winText` feed the host's level list and
// practice result.
import { MINIGAME } from '../minigame.mjs'
import MemoryBoard from './memory/Board'
import CandyBoard from './candy/Board'

export const GAMES = [
  {
    id: 'memory',
    title: 'Lật thẻ tìm cặp',
    blurb: 'Nhớ vị trí các thẻ Pokémon và ghép đủ cặp trước khi hết 5 phút.',
    Board: MemoryBoard,
    levelInfo: (d) => `${MINIGAME.GRID[d - 1].pairs} cặp`,
    winText: ({ flips }) => `Bạn ghép đủ cặp sau ${flips} lần lật.`,
  },
  {
    id: 'candy',
    title: 'Candy Rush',
    blurb: 'Hoán đổi kẹo, xếp 3 ô giống nhau và đạt đủ điểm trước khi hết nước hoặc hết 5 phút.',
    Board: CandyBoard,
    levelInfo: (d) => `${MINIGAME.CANDY.TARGET[d - 1]} điểm · ${MINIGAME.CANDY.MOVES[d - 1]} nước`,
    winText: ({ score, moves }) => `Bạn đạt ${score} điểm sau ${moves} nước.`,
  },
]
