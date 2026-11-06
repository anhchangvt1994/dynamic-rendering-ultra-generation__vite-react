// yarn dev: abc@gmail.com signs in with no code and sees its mock data.
//   ORIGIN=http://localhost:5191 node scripts/browser/dev-test-account.mjs
import { mkdirSync } from 'node:fs'
import puppeteer from 'puppeteer'

const ORIGIN = process.env.ORIGIN || 'http://localhost:5191'
const SHOTS = process.env.SHOTS || '.superpowers/qa/shots/dev-test-account'
mkdirSync(SHOTS, { recursive: true })

const results = []
const check = (name, pass, detail = '') => {
  results.push(pass)
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${pass ? '' : ` — ${detail}`}`)
}
const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ||
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
})
const errors = []
const page = await browser.newPage()
page.on('pageerror', (e) => errors.push(e.message))
await page.setViewport({ width: 420, height: 900 })
await page.goto(`${ORIGIN}/robots.txt`)
await page.evaluate(() => localStorage.clear())

await page.goto(`${ORIGIN}/dang-nhap`, { waitUntil: 'networkidle2' })
await page.type('input[type="email"]', 'abc@gmail.com')
await page.click('button.primary')
await page
  .waitForFunction(() => location.pathname === '/', { timeout: 15000 })
  .catch(() => {})
check(
  'abc@gmail.com: no code, straight in',
  new URL(page.url()).pathname === '/' &&
    (await page.evaluate(() => Boolean(localStorage.getItem('pokedex:auth')))),
  page.url()
)

const visit = async (path, selector, name) => {
  await page.goto(`${ORIGIN}${path}`, { waitUntil: 'networkidle2' })
  const found = await page
    .waitForFunction(selector, { timeout: 15000 })
    .then(() => true)
    .catch(() => false)
  await page.screenshot({ path: `${SHOTS}/${name}.png` })
  return found
}
check(
  'bag: every item',
  await visit('/tui-do', () => /×?40/.test(document.body.innerText), 'bag')
)
await page.click('.pockets [aria-label^="Mảnh & hổ phách"]')
check(
  'bag: shards and amber stones',
  await page
    .waitForFunction(() => /Pikachu/i.test(document.querySelector('.pocket-panel')?.innerText || ''), { timeout: 15000 })
    .then(() => true)
    .catch(() => false)
)
await page.screenshot({ path: `${SHOTS}/bag-shards.png` })
check(
  'kitchen: dishes found',
  await visit(
    '/che-bien',
    () => document.body.innerText.length > 200 && !/Đăng nhập để/.test(document.body.innerText),
    'kitchen'
  )
)
check(
  'my Pokémon: the six individuals',
  await visit('/pokemon-cua-toi', () => /Pika/.test(document.body.innerText), 'my-pokemon')
)

await browser.close()
if (errors.length) console.log('PAGE ERRORS', errors)
const failed = results.filter((ok) => !ok).length
console.log(`${results.length - failed}/${results.length} PASS`)
process.exitCode = failed || errors.length ? 1 : 0
