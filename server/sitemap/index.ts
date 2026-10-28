import puppeteer from 'puppeteer-core'
import type { Browser, Page } from 'puppeteer-core'
import { PROCESS_ENV } from '../src/utils/InitEnv'
import { getSitemapOptions, getCrawlUrl, normalizeCrawlUrl } from './config'
import { crawlPage, prepareCrawlPage } from './crawl-page'
import { crawlSite } from './generator'
import { SitemapWriter } from './writer'
import { crawlHttp } from './http'
import { createPagePool } from './page-pool'
import { readSitemapSeeds } from './seeds'

const flags = {
  '--host': 'HOST',
  '--crawl-origin': 'SITEMAP_CRAWL_ORIGIN',
  '--output-dir': 'SITEMAP_OUTPUT_DIR',
  '--concurrency': 'SITEMAP_CONCURRENCY',
  '--render-concurrency': 'SITEMAP_RENDER_CONCURRENCY',
  '--mode': 'SITEMAP_MODE',
  '--seed-sitemap': 'SITEMAP_SEED_SITEMAP',
  '--reuse-existing': 'SITEMAP_REUSE_EXISTING',
  '--max-response-mb': 'SITEMAP_MAX_RESPONSE_MB',
  '--max-pages': 'SITEMAP_MAX_PAGES',
  '--timeout-ms': 'SITEMAP_TIMEOUT_MS',
  '--idle-ms': 'SITEMAP_IDLE_MS',
  '--settle-ms': 'SITEMAP_SETTLE_MS',
  '--retries': 'SITEMAP_RETRIES',
  '--ready-selector': 'SITEMAP_READY_SELECTOR',
  '--browser-engine': 'SITEMAP_BROWSER_ENGINE',
  '--browser-ws-endpoint': 'SITEMAP_BROWSER_WS_ENDPOINT',
  '--executable-path': 'SITEMAP_EXECUTABLE_PATH',
}

const main = async () => {
  const env = { ...PROCESS_ENV }
  const seeds: string[] = []
  const args = process.argv.slice(2)
  if (args.includes('--help')) {
    console.log(
      'Usage: yarn start:sgen [options]\n' +
        Object.keys(flags)
          .map((flag) => `  ${flag} <value>`)
          .join('\n') +
        '\n  --seed-url <path-or-url> (repeatable)\nSee server/sitemap/README.md for defaults and VPS benchmarking.'
    )
    return
  }
  for (let i = 0; i < args.length; i++) {
    const flag = args[i],
      value = args[++i]
    if (!(flag in flags) && flag !== '--seed-url')
      throw new Error(`Unknown option: ${flag}`)
    if (!value || value.startsWith('--'))
      throw new Error(`Missing value for ${flag}`)
    if (flag === '--seed-url') seeds.push(value)
    else env[flags[flag]] = value
  }
  const options = getSitemapOptions(env)
  if (!['chromium', 'lightpanda'].includes(options.engine))
    throw new Error('--browser-engine must be chromium or lightpanda')
  if (options.executablePath && options.engine !== 'chromium')
    throw new Error('--executable-path requires --browser-engine chromium')
  const explicitSeeds = [...seeds]
  const existingSeeds = options.reuseExisting
    ? readSitemapSeeds(options.seedSitemap, options.host, options.maxPages)
    : []
  seeds.push(...existingSeeds)
  const queueConcurrency =
    options.mode === 'render' ? options.renderConcurrency : options.concurrency
  const pool = createPagePool(options.renderConcurrency)
  const metrics = {
    httpPages: 0,
    httpOnlyPages: 0,
    renderedPages: 0,
    peakHttp: 0,
    httpTotalMs: 0,
    renderTotalMs: 0,
    browserNavigationMs: 0,
    browserIdleMs: 0,
    browserSettleMs: 0,
    browserExtractMs: 0,
  }
  let activeHttp = 0
  const entrypoints = new Set(
    explicitSeeds
      .map((seed) =>
        normalizeCrawlUrl(
          seed,
          options.host + '/',
          options.host,
          options.crawlOrigin
        )
      )
      .filter(Boolean)
  )
  const writer = new SitemapWriter(options)
  let browser: Browser | undefined
  let ownsBrowser = false
  const pages: Page[] = []
  const laneConnections: Browser[] = []
  const controller = new AbortController()
  const stop = () => {
    controller.abort(new Error('Sitemap generation cancelled'))
    // Closing targets interrupts a pending navigation/network-idle wait.
    for (const page of pages) page.close().catch(() => {})
  }
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)
  let progressTimer: NodeJS.Timeout | undefined
  const started = performance.now()
  try {
    console.log(
      `[SITEMAP] ${options.host}, crawlOrigin=${options.crawlOrigin}, engine=${options.engine}, mode=${options.mode}, concurrency=${queueConcurrency}, renderConcurrency=${options.renderConcurrency}, maxPages=${options.maxPages}, output=${options.outputDir}`
    )
    if (options.wsEndpoint)
      browser = await puppeteer.connect({
        browserWSEndpoint: options.wsEndpoint,
      })
    else if (options.executablePath) {
      ownsBrowser = true
      browser = await puppeteer.launch({
        executablePath: options.executablePath,
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
      })
    } else {
      // Load the shared engine launcher only for the default path. Standalone
      // CDP/Chrome fixtures need neither SSR config nor its worker pools.
      const BrowserManager =
        require('../src/puppeteer-ssr/utils/BrowserManager').default
      const manager = BrowserManager({ engine: options.engine })
      browser = await manager?.get()
      ownsBrowser = true
    }
    if (!browser?.connected)
      throw new Error(
        'Browser is unavailable; check the configured engine/dependencies'
      )
    controller.signal.throwIfAborted()
    // Lightpanda supports one target per CDP connection. Each lane keeps its
    // own connection/page for the job; Chromium shares the primary connection.
    for (let lane = 0; lane < options.renderConcurrency; lane++) {
      let laneBrowser = browser
      if (options.engine === 'lightpanda' && lane > 0) {
        laneBrowser = await puppeteer.connect({
          browserWSEndpoint: browser.wsEndpoint(),
        })
        laneConnections.push(laneBrowser)
      }
      const page = await laneBrowser.newPage()
      pages.push(page)
      await prepareCrawlPage(page)
    }
    let progress = { visited: 0, saved: 0, queued: 1 }
    const activeUrls: string[] = []
    const logProgress = () =>
      console.log(
        `[SITEMAP] crawled=${progress.visited}, saved=${progress.saved}, discovered=${progress.queued}, elapsed=${Math.round((performance.now() - started) / 1000)}s${activeUrls.some(Boolean) ? ', active=' + activeUrls.filter(Boolean).join(' | ') : ''}`
      )
    progressTimer = setInterval(logProgress, 5000)
    progressTimer.unref()
    const stats = await crawlSite({
      ...options,
      concurrency: queueConcurrency,
      seeds,
      signal: controller.signal,
      crawl: async (url, lane) => {
        activeUrls[lane] = url
        try {
          // Entry/listing pages need the CSR view to discover pagination and
          // hydration links that the SEO snapshot can intentionally limit.
          const listing =
            new URL(url).pathname.split('/').filter(Boolean).length < 2
          if (
            options.mode === 'auto' &&
            !listing &&
            !entrypoints.has(url) &&
            !options.readySelector
          ) {
            const startedHttp = performance.now()
            metrics.httpPages++
            metrics.peakHttp = Math.max(metrics.peakHttp, ++activeHttp)
            let result
            try {
              result = await crawlHttp(url, {
                ...options,
                signal: controller.signal,
              })
            } finally {
              activeHttp--
              metrics.httpTotalMs += performance.now() - startedHttp
            }
            if (!result.needsRender) {
              metrics.httpOnlyPages++
              return result
            }
          }
          return await pool.run(async (pageLane) => {
            controller.signal.throwIfAborted()
            const startedRender = performance.now()
            metrics.renderedPages++
            try {
              const result = await crawlPage(
                pages[pageLane],
                getCrawlUrl(url, options.crawlOrigin),
                options
              )
              if (result.timings) {
                metrics.browserNavigationMs += result.timings.navigationMs
                metrics.browserIdleMs += result.timings.idleMs
                metrics.browserSettleMs += result.timings.settleMs
                metrics.browserExtractMs += result.timings.extractMs
              }
              return result
            } finally {
              metrics.renderTotalMs += performance.now() - startedRender
            }
          })
        } finally {
          activeUrls[lane] = ''
        }
      },
      onPage: (url) => writer.add(url),
      onProgress: (stats) => {
        progress = stats
        if (stats.visited === 1) logProgress()
      },
    })
    const output = writer.finish()
    console.log(
      '[SITEMAP RESULT] ' +
        JSON.stringify({
          ...stats,
          seedUrls: existingSeeds.length,
          ...output,
          concurrency: queueConcurrency,
          renderConcurrency: options.renderConcurrency,
          mode: options.mode,
          ...Object.fromEntries(
            Object.entries(metrics).map(([key, value]) => [
              key,
              Math.round(value),
            ])
          ),
          peakRender: pool.peak,
          elapsedMs: Math.round(performance.now() - started),
          nodePeakRssMB: Math.round(process.resourceUsage().maxRSS / 1024),
        })
    )
  } finally {
    clearInterval(progressTimer)
    process.removeListener('SIGINT', stop)
    process.removeListener('SIGTERM', stop)
    writer.abort()
    for (const page of pages) await page.close().catch(() => {})
    for (const connection of laneConnections) await connection.disconnect()
    if (browser) {
      if (ownsBrowser && options.engine === 'chromium')
        await browser.close().catch(() => {})
      else await browser.disconnect()
    }
  }
}

if (require.main === module)
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('[SITEMAP ERROR]', error.message)
      process.exit(1)
    })
