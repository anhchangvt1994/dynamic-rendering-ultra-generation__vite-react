// Suggested (unofficial) BST ladder: BST = HP + ATK + DEF + SpA + SpD + SPE,
// ranked F → EX. `min` is inclusive; the next tier's `min` is exclusive.
// `color` is the tier's material, F → EX: ash, stone, bronze, silver,
// emerald, sapphire, gold, ruby, amethyst, prismatic (a: lit edge, b: body).
export const POWER_TIERS = [
  {
    rank: 'F',
    min: 0,
    label: 'Rất yếu',
    color: { a: '#a3a9b1', b: '#474c54' },
  },
  { rank: 'E', min: 200, label: 'Yếu', color: { a: '#c2b59c', b: '#5e5546' } },
  {
    rank: 'D',
    min: 300,
    label: 'Dưới trung bình',
    color: { a: '#eaa86f', b: '#7a4524' },
  },
  {
    rank: 'C',
    min: 400,
    label: 'Trung bình',
    color: { a: '#e8f1fa', b: '#71808f' },
  },
  { rank: 'B', min: 450, label: 'Khá', color: { a: '#6ff0b5', b: '#0f7550' } },
  { rank: 'A', min: 500, label: 'Mạnh', color: { a: '#7cc4ff', b: '#1d4fa8' } },
  {
    rank: 'S',
    min: 550,
    label: 'Rất mạnh',
    color: { a: '#ffe27a', b: '#b8700a' },
  },
  {
    rank: 'SS',
    min: 600,
    label: 'Cực mạnh',
    color: { a: '#ff8aa0', b: '#a3122f' },
  },
  {
    rank: 'SSS',
    min: 680,
    label: 'Hàng đầu',
    color: { a: '#e2b6ff', b: '#6a1fb5' },
  },
  {
    rank: 'EX',
    min: 780,
    label: 'Huyền thoại',
    color: { a: '#fff4fb', b: '#d0349f' },
  },
]

export function getPokemonPower(stats = []) {
  const bst = stats.reduce(
    (sum, entry) => sum + (Number(entry?.base_stat) || 0),
    0
  )
  const level = POWER_TIERS.filter((tier) => bst >= tier.min).length - 1
  const tier = POWER_TIERS[level]
  const next = POWER_TIERS[level + 1]
  return {
    bst,
    level,
    rank: tier.rank,
    label: tier.label,
    color: tier.color,
    // 0..1 position inside the current tier, used to part-fill its segment
    progress: next ? (bst - tier.min) / (next.min - tier.min) : 1,
  }
}
