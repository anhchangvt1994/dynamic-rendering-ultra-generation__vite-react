import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import test from 'node:test'
import puppeteer from 'puppeteer-core'
const require = createRequire(import.meta.url)
const { transform } = require('sucrase')
// Execute the production waiting functions with a real Page. Isolate only the
// unrelated worker/cache bootstrap; no fake browser or copy of wait logic.
const source = fs.readFileSync(
  process.env.ISR_WAIT_SOURCE ||
    'server/src/puppeteer-ssr/utils/ISRHandler.worker/worker.ts',
  'utf8'
)
const safe = source.slice(
  source.indexOf('const _getSafePage ='),
  source.indexOf('const fetchData =')
)
const waiting = source.slice(
  source.indexOf('const _waitForNetworkIdle ='),
  source.indexOf('const gapDurationDefault =')
)
const makeWait = (networkIdle) =>
  new Function(
    'ServerConfig',
    'IS_NETWORK_IDLE_WAIT',
    'BANDWIDTH_LEVEL',
    'BANDWIDTH_LEVEL_LIST',
    'CRAWL_WAIT_OPTIONS',
    'regexNotFoundPageID',
    'Console',
    transform(safe + waiting + '\nreturn waitResponse', {
      transforms: ['typescript'],
    }).code
  )(
    { crawl: { speed: 3000, routes: {} } },
    networkIdle,
    2,
    { ONE: 1 },
    {
      networkIdleMs: Number(process.env.ISR_TEST_IDLE_MS || 80),
      titleWaitMs: 500,
      requestTimeoutMs: 3000,
      maxWaitMs: 3000,
    },
    /never-notfound/,
    { error: () => {} }
  )
test('ISR network-idle profile uses one navigation wait and retains delayed API rendering', async () => {
  const server = createServer((req, res) => {
    if (req.url === '/api') {
      setTimeout(() => res.end('ready'), 150)
      return
    }
    res.setHeader('content-type', 'text/html')
    res.end(
      `<title>Ready</title><script>fetch('/api').then(()=>document.body.innerHTML='<a href="/late">Late</a>')</script>`
    )
  })
  let browser, page
  try {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    browser = process.env.ISR_WAIT_WS_ENDPOINT
      ? await puppeteer.connect({
          browserWSEndpoint: process.env.ISR_WAIT_WS_ENDPOINT,
        })
      : await puppeteer.launch({
          executablePath:
            process.env.CHROME_EXECUTABLE ||
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          headless: true,
          args: ['--no-sandbox'],
        })
    page = await browser.newPage()
    const goto = page.goto.bind(page)
    const modes = []
    page.goto = (url, options) => {
      modes.push(options.waitUntil)
      return goto(url, options)
    }
    const started = performance.now()
    const response = await makeWait(true)(
      page,
      `http://127.0.0.1:${server.address().port}`,
      3000
    )
    assert.equal(response.status(), 200)
    assert.equal(await page.$eval('a', (a) => a.getAttribute('href')), '/late')
    assert.deepEqual(modes, [process.env.ISR_WAIT_EXPECT || 'domcontentloaded'])
    console.log(
      JSON.stringify({ isrWaitMs: Math.round(performance.now() - started) })
    )
  } finally {
    if (process.env.ISR_WAIT_WS_ENDPOINT) {
      await page?.close()
      await browser?.disconnect()
    } else await browser?.close()
    await new Promise((resolve) => server.close(resolve))
  }
})
