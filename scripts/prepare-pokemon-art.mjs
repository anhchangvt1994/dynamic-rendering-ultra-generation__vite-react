// Official PokéAPI artwork, resized once for the small-screen catalogue.
// Source: https://github.com/PokeAPI/sprites (artwork belongs to Pokémon).
import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
const directory = new URL(
  '../src/assets/static/images/pokemon/',
  import.meta.url
)
await mkdir(directory, { recursive: true })
let next = 1
let inputBytes = 0
let outputBytes = 0
let done = 0
const failures = []
async function worker() {
  while (next <= 151) {
    const id = next++
    try {
      const response = await fetch(
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
        { signal: AbortSignal.timeout(20000) }
      )
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const source = Buffer.from(await response.arrayBuffer())
      inputBytes += source.length
      const thumb = await sharp(source)
        .resize(192, 192, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 76, effort: 5 })
        .toBuffer()
      await writeFile(new URL(`${id}.webp`, directory), thumb)
      outputBytes += thumb.length
      if ([6, 25, 94].includes(id)) {
        const hero = await sharp(source)
          .resize(480, 480, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 86, effort: 5 })
          .toBuffer()
        await writeFile(new URL(`hero-${id}.webp`, directory), hero)
        outputBytes += hero.length
      }
      done++
    } catch (error) {
      failures.push(`${id}: ${error.message}`)
    }
  }
}
await Promise.all(Array.from({ length: 8 }, worker))
console.log(
  JSON.stringify({ processed: done, inputBytes, outputBytes, failures })
)
if (failures.length) process.exitCode = 1
