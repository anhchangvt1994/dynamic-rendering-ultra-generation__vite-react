// Measures where each Pokémon stands inside its square artwork and writes
// src/pages/PokemonPage/artCenters.json: { "<id>": [x, y] } in 1/1000 of the
// canvas side, offset of the character's visual centre from the canvas centre.
// Run: node scripts/measure-pokemon-art.mjs   (needs network, ~1025 PNGs)
import sharp from 'sharp'
import { writeFile } from 'node:fs/promises'
import { measureArtCenter } from '../src/pages/PokemonPage/artCenter.mjs'

const COUNT = 1025
const SIZE = 192
const out = new URL('../src/pages/PokemonPage/artCenters.json', import.meta.url)
const result = {}
const failures = []
let next = 1

async function worker() {
  while (next <= COUNT) {
    const id = next++
    try {
      const response = await fetch(
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
        { signal: AbortSignal.timeout(20000) }
      )
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const { data } = await sharp(Buffer.from(await response.arrayBuffer()))
        .resize(SIZE, SIZE, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .ensureAlpha()
        .extractChannel('alpha')
        .raw()
        .toBuffer({ resolveWithObject: true })
      const { x, y } = measureArtCenter(data, SIZE)
      result[id] = [Math.round(x * 1000), Math.round(y * 1000)]
    } catch (error) {
      failures.push(`${id}: ${error.message}`)
    }
  }
}
await Promise.all(Array.from({ length: 8 }, worker))
const sorted = Object.fromEntries(
  Object.entries(result).sort((a, b) => a[0] - b[0])
)
await writeFile(out, JSON.stringify(sorted))
console.log(JSON.stringify({ measured: Object.keys(sorted).length, failures }))
if (failures.length) process.exitCode = 1
