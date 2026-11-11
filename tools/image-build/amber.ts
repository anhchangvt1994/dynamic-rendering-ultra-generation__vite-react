/**
 * yarn build:amber-art: shoots every finished amber stone into
 * pokemon-art/<id>/amber.webp (served as /api/image/rig/<id>/amber.webp), so
 * the shelf shows a plain <img> instead of ~200 SVG nodes and four filters.
 * The stone is drawn by the app's own AmberCard, so the dev server must run:
 *
 *   yarn build:amber-art                 species missing a current amber.webp
 *   yarn build:amber-art --ids 25,133-136
 *   --force          shoot again even when current
 *   --url URL        dev server (default http://localhost:5173)
 *   --out DIR        default pokemon-art/ (or POKEMON_ART_DIR)
 *   --jobs N         pages at the same time (default 4)
 * Needs network (the artwork comes from the PokéAPI sprites). CHROME=path
 * picks the browser; the stone art changes → bump AMBER_VERSION.
 */
import fs from 'fs'
import path from 'path'
import puppeteer, { type Page } from 'puppeteer'
import sharp from 'sharp'
import catalog from '../../src/pages/QuizPage/shards/catalog.json'
import { shardRule } from '../../src/pages/QuizPage/shards/rules.mjs'

/** Bump when AmberCard's finished stone looks different: every key is shot again. */
const AMBER_VERSION = 1
const SIZE = 384
const ROOT = path.resolve(__dirname, '../../')
const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`)
  return i < 0 ? undefined : (process.argv[i + 1] ?? '')
}
const OUT = path.resolve(
  ROOT,
  arg('out') || process.env.POKEMON_ART_DIR || 'pokemon-art'
)
const URL = arg('url') || 'http://localhost:5173'
const JOBS = Math.max(1, Number(arg('jobs')) || 4)
const FORCE = process.argv.includes('--force')

const parseIds = (text: string) => {
  const ids = new Set<number>()
  for (const part of text.split(',')) {
    const [a, b = a] = part.trim().split('-').map(Number)
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < a)
      throw new Error(`--ids: bad range "${part}"`)
    for (let i = a; i <= b; i++) ids.add(i)
  }
  return [...ids]
}

type Entry = { id: number; name: string; required: number }
const entries: Entry[] = (catalog as any).species.map((s: any) => ({
  id: s.id,
  name: s.name,
  required: shardRule(s).required,
}))
const wanted = arg('ids') ? new Set(parseIds(String(arg('ids')))) : null

const current = (e: Entry) => {
  try {
    const meta = JSON.parse(
      fs.readFileSync(path.join(OUT, String(e.id), 'amber.json'), 'utf8')
    )
    return (
      meta.version === AMBER_VERSION &&
      meta.required === e.required &&
      fs.existsSync(path.join(OUT, String(e.id), 'amber.webp'))
    )
  } catch {
    return false
  }
}

const STYLE = `
html,body{margin:0;background:transparent!important}
body>*:not(.bake-host){display:none!important}
.bake-host{position:fixed;left:0;top:0;width:${SIZE}px;height:${SIZE}px}
.bake-host *{animation:none!important;transition:none!important}
.bake-host>span{filter:none!important}
.bake-host svg{transform:none!important}
.bake-host .amber-aura,.bake-host .amber-orbit,.bake-host .amber-spark,.bake-host .amber-glint{display:none!important}
`

async function shoot(page: Page, e: Entry) {
  // a string, not a function: sucrase would rewrite its `import()` and `?.`
  // into helpers that only exist in node
  await page.evaluate(`(async () => {
    const e = ${JSON.stringify(e)}
    const old = document.querySelector('.bake-host')
    if (old) old.remove()
    const host = document.createElement('div')
    host.className = 'bake-host'
    document.body.append(host)
    const art = new Image()
    art.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/' + e.id + '.png'
    await art.decode()
    const m = await import('/tools/image-build/amber-entry.tsx')
    if (window.__unmount) window.__unmount()
    window.__unmount = m.bake(host, { speciesId: e.id, name: e.name, required: e.required })
    const until = Date.now() + 15000
    while (!host.querySelector('image[href^="data:image/png"]') || !host.querySelector('svg')) {
      if (Date.now() > until) throw new Error('stone never drew')
      await new Promise((r) => setTimeout(r, 50))
    }
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 120)))
  })()`)
  const host = await page.$('.bake-host')
  const png = (await host!.screenshot({ omitBackground: true })) as Buffer
  const dir = path.join(OUT, String(e.id))
  fs.mkdirSync(dir, { recursive: true })
  const webp = await sharp(png)
    .webp({ quality: 90, alphaQuality: 100 })
    .toBuffer()
  fs.writeFileSync(path.join(dir, 'amber.webp'), webp)
  fs.writeFileSync(
    path.join(dir, 'amber.json'),
    JSON.stringify({ version: AMBER_VERSION, required: e.required })
  )
  return webp.length
}

async function main() {
  const todo = entries.filter(
    (e) => (!wanted || wanted.has(e.id)) && (FORCE || !current(e))
  )
  console.log(
    `[amber-art] ${todo.length} of ${entries.length} species -> ${OUT}`
  )
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.CHROME || undefined,
    defaultViewport: { width: SIZE, height: SIZE, deviceScaleFactor: 1 },
  })
  let next = 0
  let done = 0
  let bytes = 0
  const failed: number[] = []
  const worker = async () => {
    const page = await browser.newPage()
    await page.goto(URL, { waitUntil: 'domcontentloaded' })
    await page.addStyleTag({ content: STYLE })
    for (;;) {
      const e = todo[next++]
      if (!e) break
      try {
        bytes += await shoot(page, e)
      } catch (err) {
        failed.push(e.id)
        console.error(`[amber-art] ${e.id}: ${(err as Error).message}`)
      }
      if (++done % 25 === 0) console.log(`[amber-art] ${done}/${todo.length}`)
    }
    await page.close()
  }
  await Promise.all(Array.from({ length: JOBS }, worker))
  await browser.close()
  console.log(
    `[amber-art] done: ${done - failed.length} built, ${failed.length} failed, ${(bytes / 1024 / 1024).toFixed(1)} MB`
  )
  if (failed.length) process.exitCode = 1
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
