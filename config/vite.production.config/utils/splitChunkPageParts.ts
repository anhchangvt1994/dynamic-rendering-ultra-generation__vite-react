// NOTE - Heavy parts of a page in a chunk of their own, so the page chunk
// keeps room under the 150 KB budget. They are imported statically, so
// Vite preloads them together with the page: nothing renders later.
const PAGE_PARTS: [name: string, files: RegExp][] = [
  // the habitat scenery behind a Pokémon (SVG motifs per type)
  [
    'pokemon-habitat',
    /src\/pages\/PokemonPage\/(PokemonHabitat|HabitatMotifs|habitat)\./,
  ],
]

const splitChunkPageParts = (pathName: string): boolean | string => {
  if (!pathName || pathName.includes('node_modules/')) return false
  return PAGE_PARTS.find(([, files]) => files.test(pathName))?.[0] ?? false
} // splitChunkPageParts

export default splitChunkPageParts
