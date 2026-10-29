// Run against yarn dev (Vite): node scripts/browser/pokemon-navigation.mjs
// Uses the real page/Swiper with delayed API fixtures, without external APIs.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import puppeteer from 'puppeteer-core'
import { transform } from 'sucrase'

const origin = process.env.POKEMON_TEST_ORIGIN || 'http://localhost:5173'
const source = fs.readFileSync(
  new URL('../../src/utils/StringHelper.ts', import.meta.url),
  'utf8'
)
const exports = {}
vm.runInNewContext(
  transform(source, { transforms: ['typescript', 'imports'] }).code,
  { exports }
)
const names = {
  1: 'bulbasaur',
  25: 'pikachu',
  26: 'raichu',
  27: 'sandshrew',
  94: 'gengar',
  1025: 'pecharunt',
}
const pokemon = (key) => {
  const id =
    Number(key) || Number(Object.keys(names).find((id) => names[id] === key))
  return {
    id,
    name: names[id] || `pokemon-${id}`,
    stats: [],
    moves: [],
    abilities: [],
    height: id,
    weight: id,
    types: [
      {
        slot: 1,
        type: { name: id === 25 || id === 26 ? 'electric' : 'ghost' },
      },
    ],
  }
}
const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_PATH ||
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-sandbox'],
})
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 430, height: 900 })
  await page.setRequestInterception(true)
  const requests = []
  const errors = []
  const responseDelays = new Map()
  let delayedLayout = false
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', async (request) => {
    const url = new URL(request.url())
    const json = (value) =>
      request.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(value),
      })
    if (
      delayedLayout &&
      request.isNavigationRequest() &&
      url.origin === origin
    ) {
      const html = await (await fetch(url)).text()
      return request.respond({
        status: 200,
        contentType: 'text/html',
        body: html.replace(
          '</head>',
          '<style id="delayed-carousel-layout">.swiper {width:0!important;max-width:0!important}</style></head>'
        ),
      })
    }
    if (url.searchParams.has('requestInfo')) {
      const info = JSON.parse(
        exports.decode(url.searchParams.get('requestInfo').replace(/ /g, '+'))
      )
      const match = info.a?.match(/^\/pokemon\/([^/?]+)\/?$/)
      if (match) {
        const data = pokemon(match[1])
        requests.push({ id: data.id, key: match[1], time: Date.now() })
        await new Promise((resolve) =>
          setTimeout(resolve, responseDelays.get(data.id) ?? 450)
        )
        return json(data)
      }
      return json({ data: [], results: [], total: 0 })
    }
    if (
      request.headers().accept === 'application/json' &&
      url.origin === origin
    ) {
      return json({ status: 200, originPath: url.pathname, path: url.pathname })
    }
    if (request.resourceType() === 'image')
      return request.respond({
        status: 200,
        contentType: 'image/png',
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9ZkAAAAASUVORK5CYII=',
          'base64'
        ),
      })
    if (url.origin !== origin && !url.protocol.startsWith('ws'))
      return request.abort()
    return request.continue()
  })
  await page.goto(`${origin}/pokemon/pikachu`, {
    waitUntil: 'domcontentloaded',
  })
  await page.waitForFunction(
    () =>
      document.querySelector('.swiper')?.swiper &&
      document.querySelector('[aria-busy="false"]'),
    { timeout: 20000 }
  )
  const selection = () =>
    page.evaluate(() => {
      const swiper = document.querySelector('.swiper')?.swiper
      return {
        id: swiper?.activeIndex + 1,
        item: Number(
          document.querySelector('.swiper-slide-active')?.dataset.pokemonId
        ),
        pathname: location.pathname,
        busy: document.querySelector('[aria-busy]')?.getAttribute('aria-busy'),
      }
    })
  const direct = await selection()
  console.log('Direct name URL:', direct)
  assert.equal(direct.id, 25)
  assert.equal(direct.item, 25)
  await page.evaluate(() =>
    history.replaceState(
      { usr: { pokemonId: 25, keepPage: true }, key: 'reload-check', idx: 0 },
      ''
    )
  )
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () =>
      document.querySelector('.swiper')?.swiper &&
      document.querySelector('[aria-busy="false"]'),
    { timeout: 20000 }
  )
  const reloaded = await selection()
  console.log('Reload with history state:', reloaded)
  assert.equal(reloaded.id, 25)
  assert.equal(reloaded.item, 25)
  delayedLayout = true
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () =>
      document.querySelector('.swiper')?.swiper &&
      document.querySelector('[aria-busy="false"]'),
    { timeout: 20000 }
  )
  await page.evaluate(() => {
    document.querySelector('#delayed-carousel-layout').remove()
    document.querySelector('.swiper').swiper.update()
  })
  await new Promise((resolve) => setTimeout(resolve, 200))
  const resized = await selection()
  console.log('Reload after delayed layout:', resized)
  assert.equal(resized.id, 25)
  assert.equal(resized.item, 25)
  delayedLayout = false
  await page.evaluate(() =>
    history.replaceState(
      { usr: { pokemonId: 1, keepPage: true }, key: 'stale-state', idx: 0 },
      ''
    )
  )
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () =>
      document.querySelector('.swiper')?.swiper &&
      document.querySelector('[aria-busy="false"]'),
    { timeout: 20000 }
  )
  const canonical = await selection()
  console.log('Reload with stale history ID:', canonical)
  assert.equal(
    canonical.id,
    25,
    'The URL name must take precedence over stale navigation state'
  )
  // No adjacent detail has finished warming up. The target should start
  // loading during its 900ms slide animation, not after the animation settles.
  requests.length = 0
  const started = Date.now()
  await page.evaluate(() => {
    window.__pokemonMotion = {}
    const region = document.querySelector('[aria-busy]')
    const observer = new MutationObserver(() => {
      if (region.getAttribute('aria-busy') === 'false') {
        window.__pokemonMotion.ready = performance.now()
        observer.disconnect()
      }
    })
    observer.observe(region, {
      attributes: true,
      attributeFilter: ['aria-busy'],
    })
    const swiper = document.querySelector('.swiper').swiper
    swiper.once('transitionEnd', () => {
      window.__pokemonMotion.ended = performance.now()
    })
    swiper.slideTo(93, 900)
  })
  await new Promise((resolve) => setTimeout(resolve, 300))
  const target = requests.find((request) => request.id === 94)
  console.log(
    'Target request while animating:',
    target && target.time - started,
    'ms'
  )
  assert.ok(
    target,
    'The selected target API request must start before animation ends'
  )
  await page.waitForFunction(
    () =>
      document.querySelector('.swiper')?.swiper.activeIndex === 93 &&
      document.querySelector('[aria-busy="false"]'),
    { timeout: 10000 }
  )
  assert.equal((await selection()).pathname, '/pokemon/gengar')
  const reveal = await page.evaluate(
    () => window.__pokemonMotion.ready - window.__pokemonMotion.ended
  )
  console.log('Skeleton cleared after transition:', Math.round(reveal), 'ms')
  assert.ok(
    reveal >= 0 && reveal < 200,
    'A warmed target must not wait for another API call after settling'
  )
  responseDelays.set(1025, 1000)
  responseDelays.set(1, 100)
  await page.evaluate(() =>
    document.querySelector('.swiper').swiper.slideTo(1024, 900)
  )
  await new Promise((resolve) => setTimeout(resolve, 150))
  await page.evaluate(() =>
    document.querySelector('.swiper').swiper.slideTo(0, 350)
  )
  await page.waitForFunction(
    () =>
      location.pathname === '/pokemon/bulbasaur' &&
      document.querySelector('[aria-busy="false"]'),
    { timeout: 10000 }
  )
  await new Promise((resolve) => setTimeout(resolve, 1200))
  assert.equal((await selection()).id, 1)
  assert.equal(
    (await selection()).pathname,
    '/pokemon/bulbasaur',
    'A late response from an interrupted target must not change the current URL'
  )
  if (process.env.POKEMON_GESTURE_CHECKS === '1') {
    const gestures = await page.evaluate(async () =>
      (
        await import('/scripts/browser/pokemon-gestures.mjs')
      ).runPokemonGestureChecks()
    )
    console.log('Gesture regression:', gestures)
  }
  assert.deepEqual(errors, [])
  console.log(
    'PASS: reload, early target request, quick skeleton reveal and stale response isolation'
  )
} finally {
  await browser.close()
}
