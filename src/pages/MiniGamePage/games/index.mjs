// The games the platform lists. Each brings its Board and, in its own
// folder, its rules. `levelInfo` and `winText` feed the host's level list and
// practice result.
import { MINIGAME } from '../minigame.mjs'
import { lineGoal } from './block-lab/engine.mjs'

export const GAMES = [
  {
    id: 'memory',
    title: 'Lật thẻ tìm cặp',
    blurb: 'Nhớ vị trí các thẻ Pokémon và ghép đủ cặp trước khi hết 5 phút.',
    levelInfo: (d) => `${MINIGAME.GRID[d - 1].pairs} cặp`,
    winText: ({ flips = 0 } = {}) => `Bạn ghép đủ cặp sau ${flips} lần lật.`,
  },
  {
    id: 'candy',
    title: 'Candy Rush',
    blurb: 'Hoán đổi kẹo, xếp 3 ô giống nhau và đạt đủ điểm trước khi hết nước hoặc hết 5 phút.',
    levelInfo: (d) => `${MINIGAME.CANDY.TARGET[d - 1]} điểm · ${MINIGAME.CANDY.MOVES[d - 1]} nước`,
    winText: ({ score = 0, moves = 0 } = {}) => `Bạn đạt ${score} điểm sau ${moves} nước.`,
  },
  {
    id: 'tile-safari',
    title: 'Chọn cặp',
    blurb: 'Nối hai Pokémon giống nhau bằng đường tối đa 2 lần rẽ. Dọn sạch bàn trước khi hết giờ.',
    levelInfo: (d) => `${[18, 24, 28][d - 1]} cặp`,
    winText: ({ moves } = {}) => `Bạn dọn sạch bàn sau ${moves} lần nối.`,
  },
  {
    id: 'block-lab',
    title: 'Xếp khối Pokémon',
    blurb: 'Khối Pokémon tự rơi: xoay, dịch và xếp kín hàng. Chất cao chạm nóc là thua.',
    levelInfo: (d) => `${lineGoal(d)} hàng · cấp ${d}`,
    winText: ({ score = 0 } = {}) => `Bạn dọn đủ hàng và đạt ${score} điểm!`,
  },
  {
    id: 'silhouette-atelier',
    title: 'Ghép Pokémon',
    blurb: 'Kéo các mảnh vào khung, chạm để xoay thẳng hướng và ghép lại tranh Pokémon trước khi hết giờ.',
    levelInfo: (d) => `${[6, 9, 12][d - 1]} mảnh`,
    winText: ({ moves = 0 } = {}) => `Bạn ghép xong tranh sau ${moves} thao tác.`,
  },
  {
    id: 'lucky-spin',
    title: 'Vòng quay may mắn',
    blurb: 'Máy quay 3 hàng × 5 ô: quay 3 lần, xếp 3 ô liền để ăn điểm, thắng liên tiếp nhân combo. Nhận quà một lần ở cuối.',
    levelInfo: () => '3 lượt quay · 1 phần quà',
    winText: ({ reward = 'một điều bất ngờ' } = {}) => `Sau 3 lượt quay, bạn nhận ${reward}.`,
  },
]
