/*
 * The curated palettes of appearance v2: three colours per palette (main,
 * second, accent) laid over the sprite's own colour regions. SQL keeps only
 * the keys per tier (pokemon_individual_traits); a parity test compares them.
 */
const row = (tier, key, label, colors, effect) =>
  effect ? { key, label, tier, colors, effect } : { key, label, tier, colors }

export const PALETTES = [
  row('origin', 'origin', 'Nguyên bản', null),

  row('common', 'ember', 'Hổ phách', ['#e2683c', '#f6d7a7', '#3d7fb8']),
  row('common', 'sunflower', 'Hướng dương', ['#f2c230', '#fff1c2', '#7a4a1d']),
  row('common', 'moss', 'Rêu', ['#6f8f3a', '#d9e3b0', '#8a5a2b']),
  row('common', 'sky', 'Trời xanh', ['#5fa8e8', '#e6f3ff', '#f4b942']),
  row('common', 'lilac', 'Tử đinh hương', ['#b18ad6', '#f1e6fa', '#e8739a']),
  row('common', 'coral', 'San hô', ['#f07a6a', '#ffe2d6', '#2f8f9d']),
  row('common', 'mint', 'Bạc hà', ['#5fcfa5', '#e4fbf1', '#ef7c8e']),
  row('common', 'sand', 'Cát', ['#d8b77e', '#f7ecd6', '#6b8fa3']),
  row('common', 'cocoa', 'Ca cao', ['#7b4f35', '#e6cdb3', '#e0a43a']),
  row('common', 'rose', 'Hồng phấn', ['#ee9cb7', '#fff0f4', '#8a6ad1']),
  row('common', 'ocean', 'Biển sâu', ['#2f6fa6', '#cfe6f5', '#f2d16b']),
  row('common', 'forest', 'Rừng già', ['#2f6b48', '#cfe3c8', '#d9823b']),
  row('common', 'peach', 'Hồng đào', ['#f5a882', '#fff0e3', '#6ba06b']),
  row('common', 'slate', 'Đá phiến', ['#5d6b7a', '#d5dde4', '#e05f4f']),

  row('rare', 'sakura', 'Anh đào', ['#f6b8cf', '#ffffff', '#7b4a6e']),
  row('rare', 'aurora', 'Cực quang', ['#3ccf9e', '#b6f0ff', '#b06cf0']),
  row('rare', 'lava', 'Dung nham', ['#c2271e', '#ffb347', '#2b1a1a']),
  row('rare', 'glacier', 'Băng hà', ['#a8dcf0', '#f4fbff', '#3a6fb0']),
  row('rare', 'twilight', 'Chạng vạng', ['#6a4fb3', '#f2a6c0', '#ffd36b']),
  row('rare', 'jade', 'Ngọc bích', ['#2ea38a', '#d8f2e7', '#c9a23a']),
  row('rare', 'amethyst', 'Thạch anh tím', ['#7d3fb0', '#e3cff3', '#3fc1c9']),
  row('rare', 'sunset', 'Hoàng hôn', ['#f08a3c', '#ffd2a1', '#8c3f8f']),
  row('rare', 'midnight', 'Nửa đêm', ['#232a52', '#8a93c9', '#f2d16b']),
  row('rare', 'candy', 'Kẹo ngọt', ['#ff8fc8', '#a8e8ff', '#fff27a']),

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
]

export const MARK_LABELS = {
  spots: { label: 'Đốm', unit: 'chấm' },
  stripes: { label: 'Lằn', unit: 'vệt' },
  patch: { label: 'Bớt', unit: 'mảng' },
  scar: { label: 'Sẹo', unit: 'vết' },
  flower: { label: 'Hoa', unit: 'bông' },
  stars: { label: 'Chòm sao', unit: 'ngôi' },
}
