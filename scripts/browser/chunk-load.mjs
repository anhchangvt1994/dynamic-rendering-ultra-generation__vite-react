// Every page of a built site loads all its files: no failed script/style,
// no chunk error, no page error. Run against yarn start (or any host):
//   ORIGIN=http://localhost:8080 node scripts/browser/chunk-load.mjs
import puppeteer from 'puppeteer'

const ORIGIN = process.env.ORIGIN || 'http://localhost:8080'
const PAGES = [
  '/',
  '/pokemon/pikachu',
  '/pokemon/charizard',
  '/blogs',
  '/whos-that-pokemon',
  '/ai-day',
  '/tui-do',
  '/che-bien',
  '/pokemon-cua-toi',
  '/so-sanh/pikachu-vs-raichu',
  '/dang-nhap',
  '/khong-ton-tai',
]

const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ||
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
})
let failures = 0
// a cold load, then client navigation between pages (lazy chunks)
for (const path of PAGES) {
  const page = await browser.newPage()
  const problems = []
  page.on('pageerror', (e) => problems.push(`pageerror ${e.message}`))
  page.on('requestfailed', (r) => {
    if (/\.(m?js|css)(\?|$)/.test(r.url()))
      problems.push(`failed ${r.url()} ${r.failure()?.errorText}`)
  })
  page.on('response', (r) => {
    if (/\.(m?js|css)(\?|$)/.test(r.url()) && r.status() >= 400)
      problems.push(`${r.status()} ${r.url()}`)
    // a missing chunk answered by the SPA fallback (index.html)
    if (
      ['script', 'stylesheet'].includes(r.request().resourceType()) &&
      /text\/html/.test(r.headers()['content-type'] || '')
    )
      problems.push(`html for ${r.request().resourceType()} ${r.url()}`)
  })
  page.on('console', (m) => {
    if (
      m.type() === 'error' &&
      /chunk|module|import|initializ/i.test(m.text())
    )
      problems.push(`console ${m.text()}`)
  })
  await page.goto(`${ORIGIN}${path}`, { waitUntil: 'networkidle0' })
  for (const link of await page.$$eval('a[href^="/"]', (as) =>
    [...new Set(as.map((a) => a.getAttribute('href')))].slice(0, 6)
  )) {
    await page
      .evaluate((href) => {
        const a = document.querySelector(`a[href="${href}"]`)
        a?.click()
      }, link)
      .catch(() => {})
    await new Promise((r) => setTimeout(r, 800))
  }
  const ok = !problems.length
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${path}${ok ? '' : `\n  ${problems.join('\n  ')}`}`)
  await page.close()
}
await browser.close()
console.log(`${PAGES.length - failures}/${PAGES.length} PASS`)
process.exitCode = failures ? 1 : 0
