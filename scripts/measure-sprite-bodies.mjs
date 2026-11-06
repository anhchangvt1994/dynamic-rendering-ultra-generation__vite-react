// Measures the animated room sprites (PokéAPI showdown gifs) over ALL their
// frames and writes src/pages/MyPokemonPage/room/spriteBodies.json:
// { "<id>": [cx, cy, w, h] } = centre and box size of the pose held for most of
// the animation (median over its frames), as fractions of the picture's width
// (cx, w) and height (cy, h). Fractions fit the gif and its upscaled WebP alike.
// The browser cannot do this: a canvas only ever shows the current frame.
// Run: node scripts/measure-sprite-bodies.mjs
import sharp from 'sharp'
import { writeFile } from 'node:fs/promises'
import { alphaCenter } from '../src/pages/PokemonPage/artCenter.mjs'

const MAX = 1010
const out = new URL(
  '../src/pages/MyPokemonPage/room/spriteBodies.json',
  import.meta.url
)
const BASE =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/'
const result = {}
const failures = []
let next = 1

async function measure(path) {
  const response = await fetch(BASE + path, {
    signal: AbortSignal.timeout(20000),
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const input = Buffer.from(await response.arrayBuffer())
  const { delay } = await sharp(input, { animated: true, pages: -1 }).metadata()
  const { data, info } = await sharp(
    input,
    {
      animated: true,
      pages: -1,
    }
  )
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const frameHeight = info.pageHeight ?? info.height
  const frames = Math.round(info.height / frameHeight)
  const alpha = new Uint8Array(info.width * info.height)
  for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3]
  const c = alphaCenter(alpha, info.width, frameHeight, frames, delay)
  const W = info.width
  const H = frameHeight
  return (
    c &&
    [c.x / W, c.y / H, c.width / W, c.height / H].map(
      (v) => Math.round(v * 10000) / 10000
    )
  )
}

async function worker() {
  while (next <= MAX) {
    const id = next++
    try {
      const front = await measure(`${id}.gif`)
      if (front) result[id] = front
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
console.log(
  JSON.stringify({
    measured: Object.keys(sorted).length,
    failures: failures.slice(0, 10),
  })
)
