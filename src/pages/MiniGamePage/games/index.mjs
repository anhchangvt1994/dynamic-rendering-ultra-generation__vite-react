// The games the platform lists. Each brings its Board and, in its own
// folder, its rules. `levelInfo` and `winText` feed the host's level list and
// practice result.
import { MINIGAME } from '../minigame.mjs'

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
    title: 'Pokémon Tile Safari',
    blurb: 'Tìm và ghép các Pokémon cùng loài đang mở lối trên bàn gạch.',
    levelInfo: (d) => `${[24, 36, 48][d - 1]} ô Pokémon`,
    winText: ({ moves } = {}) => `Bạn dọn sạch bàn sau ${moves} lượt ghép.`,
  },
  {
    id: 'block-lab',
    title: 'Pokémon Block Lab',
    blurb: 'Đưa Pokémon vào đúng vị trí, hoàn thành hàng để ghi điểm.',
    levelInfo: (d) => `${[500, 1000, 1500][d - 1]} điểm mục tiêu`,
    winText: ({ score = 0 } = {}) => `Phòng thí nghiệm đạt ${score} điểm!`,
  },
  {
    id: 'silhouette-atelier',
    title: 'Pokémon Silhouette Atelier',
    blurb: 'Lắp ghép tranh bóng Pokémon rồi đoán danh tính của bé.',
    levelInfo: (d) => `${[4, 6, 9][d - 1]} mảnh tranh`,
    winText: ({ guesses = 0 } = {}) => `Bạn đã khám phá Pokémon sau ${guesses} lần đoán.`,
  },
  {
    id: 'lucky-spin',
    title: 'Pokémon Lucky Spin',
    blurb: 'Quay vòng quay Pokémon miễn phí để nhận quà trong lượt chơi.',
    levelInfo: () => '1 lượt quay',
    winText: ({ reward = 'một điều bất ngờ' } = {}) => `Vòng quay mang đến ${reward}.`,
  },
]
