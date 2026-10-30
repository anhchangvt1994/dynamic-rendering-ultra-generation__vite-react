import type { Page } from 'puppeteer-core'
import { normalizeCrawlUrl } from './config'
import { parseRetryAfterMs } from './retry-after'

export interface CrawlResult {
  status: number
  url?: string
  data: string[]
  retryAfterMs?: number
  noindex?: boolean
  timings?: {
    navigationMs: number
    idleMs: number
    settleMs: number
    extractMs: number
  }
}
export interface CrawlPageOptions {
  host: string
  crawlOrigin?: string
  timeoutMs?: number
  idleMs?: number
  settleMs?: number
  readySelector?: string
}

// One Page belongs to one queue lane; reuse it between navigations. DOM APIs
// resolve base/relative URLs and HTML entities without serializing the document.
export const prepareCrawlPage = async (page: Page) => {
  await page.setUserAgent(
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 SitemapGenerator/1.0'
  )
  await page.setExtraHTTPHeaders({ service: 'sitemap-crawler' })
  await page.setRequestInterception(true)
  page.on('request', (request) => {
    const blocked = ['image', 'font', 'media', 'stylesheet'].includes(
      request.resourceType()
    )
    const action = blocked ? request.abort() : request.continue()
    action.catch(() => {})
  })
}

export const crawlPage = async (
  page: Page,
  url: string,
  options: CrawlPageOptions
): Promise<CrawlResult> => {
  const {
    host,
    crawlOrigin = host,
    timeoutMs = 30000,
    idleMs = 300,
    settleMs = 100,
    readySelector,
  } = options
  const started = performance.now()
  const deadline = Date.now() + timeoutMs
  const remaining = () => Math.max(1, deadline - Date.now())
  const response = await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: remaining(),
  })
  if (!response) throw new Error(`No document response: ${url}`)
  const status = response.status()
  const retryAfterMs = parseRetryAfterMs(response.headers()['retry-after'])
  const finalUrl = normalizeCrawlUrl(page.url(), url, host, crawlOrigin)
  if (!finalUrl) return { status: 400, data: [] }
  if (status < 200 || status >= 300)
    return {
      status,
      url: finalUrl,
      data: [],
      retryAfterMs,
    }
  if (
    !/^(text\/html|application\/xhtml\+xml)\b/i.test(
      response.headers()['content-type'] || ''
    )
  ) {
    return { status: 415, url: finalUrl, data: [] }
  }
  const navigationEnd = performance.now()
  // Wait AFTER navigation: the earlier implementation waited on about:blank.
  // A timeout fails the crawl rather than silently publishing an empty graph.
  await page.waitForNetworkIdle({ idleTime: idleMs, timeout: remaining() })
  if (readySelector)
    await page.waitForSelector(readySelector, { timeout: remaining() })
  const idleEnd = performance.now()
  if (settleMs) {
    if (remaining() < settleMs)
      throw new Error(`Render settling timed out: ${url}`)
    await new Promise((resolve) => setTimeout(resolve, settleMs))
  }
  const settleEnd = performance.now()
  const result = await page.evaluate(() => {
    const robots = Array.from(document.querySelectorAll('meta[name]'))
      .filter((meta) =>
        /^(robots|googlebot)$/i.test(meta.getAttribute('name') || '')
      )
      .map((meta) => meta.getAttribute('content') || '')
      .join(',')
    return {
      hrefs: Array.from(
        document.querySelectorAll('a[href], area[href]'),
        (link) => (link as HTMLAnchorElement).href
      ),
      noindex: /\b(?:noindex|none)\b/i.test(robots),
      nofollow: /\b(?:nofollow|none)\b/i.test(robots),
    }
  })
  const headerRobots = response.headers()['x-robots-tag'] || ''
  const data =
    result.nofollow || /\b(?:nofollow|none)\b/i.test(headerRobots)
      ? []
      : [
          ...new Set(
            result.hrefs
              .map((href) =>
                normalizeCrawlUrl(href, page.url(), host, crawlOrigin)
              )
              .filter((href): href is string => !!href)
          ),
        ]
  return {
    status,
    url: finalUrl,
    data,
    timings: {
      navigationMs: navigationEnd - started,
      idleMs: idleEnd - navigationEnd,
      settleMs: settleEnd - idleEnd,
      extractMs: performance.now() - settleEnd,
    },
    noindex: result.noindex || /\b(?:noindex|none)\b/i.test(headerRobots),
  }
}
