/*
 * The curated palettes of appearance v3: three colours per palette (main,
 * second, accent). Common and rare palettes belong to a vibe of the species
 * (or to the shared pool); origin and very-rare belong to every species. SQL
 * keeps only the keys per set (pokemon_individual_traits_v); a parity test
 * compares them.
 */
export const VIBES = ['cute', 'cool', 'fierce', 'mystic', 'nature']

export const VIBE_LABELS = {
  cute: 'Dễ thương',
  cool: 'Ngầu',
  fierce: 'Dữ dằn',
  mystic: 'Huyền bí',
  nature: 'Thiên nhiên',
}

const row = (tier, key, label, colors, effect, vibe = null) => ({
  key,
  label,
  tier,
  colors,
  ...(effect ? { effect } : {}),
  vibe,
})
// one set: four common then three rare, `colors` as 'main second accent'
const set = (vibe, list) =>
  list.map(([key, label, colors], i) =>
    row(i < 4 ? 'common' : 'rare', key, label, colors.split(' '), null, vibe)
  )

export const PALETTES = [
  row('origin', 'origin', 'Nguyên bản', null),
  ...set('cute', [
    // bright, vivid, a little neon: never pale or near-white (the room
    // keeps them bright too, colour.mjs)
    ['strawberry-milk', 'Sữa dâu', '#ff5fa8 #7dfcff #fff23d'],
    ['mint-cream', 'Bạc hà kem', '#3dffb8 #ff9fd8 #b47cff'],
    ['banana', 'Bơ chuối', '#fff23d #ff8fc8 #4fd2ff'],
    ['lavender', 'Oải hương', '#c08aff #ff9fd8 #fff23d'],
    ['cotton-candy', 'Kẹo bông', '#ff6ee0 #5ce1ff #fff23d'],
    ['peach-milk', 'Đào sữa', '#ff8a4c #ff9fd8 #3dffb8'],
    ['cloud', 'Mây trời', '#29c5ff #8fffdc #ff5fa8'],
  ]),
  ...set('cool', [
    ['cobalt', 'Cobalt', '#2f5bd3 #cfe0ff #ffb52e'],
    ['blaze', 'Đỏ lửa', '#e0452b #ffd9a8 #ffd23f'],
    ['steel-blue', 'Thép xanh', '#4f6d8a #dbe6ef #ffcf3a'],
    ['night-forest', 'Rừng đêm', '#1f6f5c #bfe8d6 #ff8a3d'],
    ['lava', 'Dung nham', '#c2271e #ffb347 #ffe066'],
    ['midnight', 'Nửa đêm', '#232a52 #8a93c9 #f2d16b'],
    ['frostfire', 'Băng lửa', '#3ab0ff #e6f6ff #ff5a1f'],
  ]),
  ...set('fierce', [
    ['crimson', 'Đỏ thẫm', '#9e1b2f #f2b8a0 #ffd23f'],
    ['venom', 'Tím độc', '#7a2fa8 #d8b8f0 #9cff57'],
    ['plum', 'Mận chín', '#6b2a5e #e8b8d8 #ffd23f'],
    ['toxic-green', 'Lục độc', '#3f8f2a #d9f28a #c23cff'],
    ['blood-moon', 'Huyết nguyệt', '#6a0f24 #ff6b6b #ffd36b'],
    ['toxin', 'Độc dược', '#2a8a4a #b8ffcf #d24cff'],
    ['umbra', 'Bóng tối', '#1e1e2e #5a4a7a #ff3d6e'],
  ]),
  ...set('mystic', [
    ['nebula', 'Tinh vân', '#5b4bc4 #e0d8ff #5fe0ff'],
    ['ice-crystal', 'Băng tinh', '#8fd8f0 #f4fbff #7d6cff'],
    ['sapphire', 'Lam ngọc', '#3a7bd5 #d6e6ff #ffd24a'],
    ['ruby', 'Hồng ngọc', '#c23c7a #ffd0e4 #4fc9ff'],
    ['aurora', 'Cực quang', '#3ccf9e #b6f0ff #b06cf0'],
    ['galaxy', 'Thiên hà', '#232a6e #9aa6ff #ffe17a'],
    ['emerald', 'Lục bảo', '#149a7a #c8f5e6 #ffd24a'],
  ]),
  ...set('nature', [
    ['sprout', 'Lá non', '#7cc95a #eaf8d8 #f2a541'],
    ['sea', 'Biển', '#2f7fc0 #d2ecfa #f2d16b'],
    ['amber', 'Hổ phách', '#e0902e #ffe2b0 #2f7f6a'],
    ['ochre', 'Đất son', '#b8673a #f2d2b6 #6fd0a0'],
    ['jade', 'Ngọc bích', '#2ea38a #d8f2e7 #ffc94d'],
    ['sakura', 'Anh đào', '#f6b8cf #ffffff #5aa04a'],
    ['sunset', 'Hoàng hôn', '#f08a3c #ffd2a1 #7a3fa0'],
  ]),
  ...set(null, [
    ['sky', 'Trời xanh', '#5fa8e8 #e6f3ff #f4b942'],
    ['coral', 'San hô', '#f07a6a #ffe2d6 #2f8f9d'],
    ['mint', 'Bạc hà', '#5fcfa5 #e4fbf1 #ef7c8e'],
    ['rose', 'Hồng phấn', '#ee9cb7 #fff0f4 #8a6ad1'],
    ['candy', 'Kẹo ngọt', '#ff8fc8 #a8e8ff #fff27a'],
    ['twilight', 'Chạng vạng', '#6a4fb3 #f2a6c0 #ffd36b'],
    ['glacier', 'Băng hà', '#a8dcf0 #f4fbff #3a6fb0'],
  ]),
  row(
    'very-rare',
    'gold',
    'Ánh kim',
    ['#d9a521', '#fff0b8', '#8a5a12'],
    'metal'
  ),
  row(
    'very-rare',
    'silver',
    'Ánh bạc',
    ['#b9c2cc', '#f2f5f8', '#5c6b7a'],
    'metal'
  ),
  row('very-rare', 'obsidian', 'Hắc diện', ['#1e1e26', '#4a4a5a', '#c23cff']),
  row('very-rare', 'invert', 'Đảo sắc', null, 'invert'),
  row(
    'very-rare',
    'pearl',
    'Ngọc trai',
    ['#efe6f0', '#ffffff', '#b7a6d9'],
    'metal'
  ),
]

export const TIERS = ['origin', 'common', 'rare', 'very-rare']

export const TIER_LABELS = {
  origin: 'Nguyên bản',
  common: 'Thường',
  rare: 'Hiếm',
  'very-rare': 'Rất hiếm',
}

export const TIER_KEYS = Object.fromEntries(
  TIERS.map((tier) => [
    tier,
    PALETTES.filter((p) => p.tier === tier).map((p) => p.key),
  ])
)

/** The common and rare keys of each vibe and of the shared pool. */
export const SET_KEYS = Object.fromEntries(
  [...VIBES, 'pool'].map((name) => {
    const vibe = name === 'pool' ? null : name
    const keys = (tier) =>
      PALETTES.filter((p) => p.tier === tier && p.vibe === vibe).map(
        (p) => p.key
      )
    return [name, { common: keys('common'), rare: keys('rare') }]
  })
)

const byKey = new Map(PALETTES.map((p) => [p.key, p]))

/** The palette of a key; an unknown key is origin. */
export const paletteOf = (key) => byKey.get(key) ?? PALETTES[0]

export const MARK_KINDS = [
  'spots',
  'stripes',
  'patch',
  'scar',
  'flower',
  'stars',
  'hearts',
]

export const MARK_LABELS = {
  spots: { label: 'Đốm', unit: 'chấm' },
  stripes: { label: 'Lằn', unit: 'vệt' },
  patch: { label: 'Bớt', unit: 'mảng' },
  scar: { label: 'Sẹo', unit: 'vết' },
  flower: { label: 'Hoa', unit: 'bông' },
  stars: { label: 'Sao', unit: 'ngôi' },
  hearts: { label: 'Tim', unit: 'trái' },
}
