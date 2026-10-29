const palette = (kind, biome, light, accent, dark, petal = light) => ({
  kind,
  biome,
  light,
  accent,
  dark,
  petal,
})

const themes = {
  normal: palette(
    'meadow',
    'prairie',
    '#efe8cd',
    '#b7c397',
    '#57624e',
    '#f4ddab'
  ),
  fire: palette('ember', 'volcano', '#ffe7ae', '#f8a369', '#68483f'),
  water: palette('water', 'lagoon', '#a3f5ff', '#42d9ed', '#164f6b'),
  electric: palette(
    'circuit',
    'thunder-field',
    '#fffbc9',
    '#ffe05d',
    '#4d465b'
  ),
  grass: palette(
    'meadow',
    'garden',
    '#d9efb0',
    '#96c873',
    '#345d4c',
    '#f9dcad'
  ),
  ice: palette('frost', 'glacier', '#e8fcff', '#a4ddea', '#446c83'),
  fighting: palette(
    'arena',
    'training-ground',
    '#ffd5b0',
    '#da987c',
    '#76544a'
  ),
  poison: palette(
    'bog',
    'toxic-marsh',
    '#ebd0ff',
    '#bd83d8',
    '#514567',
    '#e5b0ff'
  ),
  ground: palette('stone', 'dunes', '#ffe1a7', '#d8b283', '#80634a'),
  flying: palette('sky', 'cloudbank', '#f0faff', '#b5d9e5', '#65839b'),
  psychic: palette('astral', 'mind-gate', '#ffe1fc', '#e2a2df', '#715077'),
  bug: palette('meadow', 'undergrowth', '#d7e4a6', '#96b76f', '#465d46'),
  rock: palette('stone', 'crags', '#e7dfc5', '#b9b4a3', '#62615b'),
  ghost: palette('astral', 'spirit-well', '#e7dcff', '#b89be6', '#51436b'),
  dragon: palette('ruins', 'dragon-sanctum', '#ffe6ac', '#83baa8', '#3e6461'),
  dark: palette('night', 'eclipse', '#d2d4f3', '#999abd', '#37364f'),
  steel: palette('metal', 'alloy-core', '#edfcff', '#b3d1d8', '#586e7d'),
  fairy: palette('enchanted', 'fairy-grove', '#ffe4f4', '#edb5da', '#805d7a'),
}

// The main environment supplies the floor; BOTH types supply their own
// geometric motifs, consistently regardless of the API's slot order.
const priority = [
  'water',
  'electric',
  'fire',
  'ice',
  'grass',
  'bug',
  'ghost',
  'dark',
  'psychic',
  'dragon',
  'ground',
  'rock',
  'steel',
  'fairy',
  'flying',
  'fighting',
  'poison',
  'normal',
]

const fusions = {
  'electric-water': 'storm-water',
  'ice-water': 'frozen-lagoon',
  'ground-water': 'tidal-shore',
  'grass-poison': 'toxic-garden',
  'fairy-grass': 'enchanted-garden',
  'fire-flying': 'firestorm',
  'fire-ghost': 'soulfire',
  'dark-ghost': 'eclipse',
  'dragon-flying': 'sky-ruins',
  'ground-rock': 'canyon',
  'electric-steel': 'magnetic-core',
  'electric-flying': 'thundercloud',
  'flying-ice': 'blizzard',
  'bug-poison': 'toxic-undergrowth',
}

// Visual design choices, not canonical habitat claims. Unknown types fall
// back safely; duplicate types never stack the same effect twice.
export function getPokemonHabitat(types = []) {
  const known = [...new Set(types.map((entry) => entry?.type?.name))]
    .filter((name) => Object.hasOwn(themes, name))
    .sort((a, b) => priority.indexOf(a) - priority.indexOf(b))
    .slice(0, 2)
  const motifs = known.length ? known : ['normal']
  const [primary, secondary] = motifs
  const theme = themes[primary]
  return {
    ...theme,
    petal: motifs.includes('poison')
      ? themes.poison.petal
      : motifs.includes('fairy')
        ? themes.fairy.petal
        : theme.petal,
    primary,
    secondary: secondary || null,
    secondaryColors: secondary ? themes[secondary] : null,
    motifs,
    fusion: secondary
      ? fusions[[primary, secondary].sort().join('-')] || null
      : null,
    signature: motifs.join('-'),
  }
}
