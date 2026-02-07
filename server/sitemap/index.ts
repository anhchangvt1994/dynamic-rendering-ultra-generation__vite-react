import path from 'path'
import BrowserManager from '../src/puppeteer-ssr/utils/BrowserManager'
import Console from '../src/utils/ConsoleHandler'
import { PROCESS_ENV } from '../src/utils/InitEnv'
import WorkerManager from '../src/utils/WorkerManager'
import generateSitemapInfo from './injector'
import { saveUrlToSitemapWorker } from './utils'
import { ICrawlHandlerParams } from './utils/types'
import { handleFinishCrawlSitemap, normalizeUrl } from './utils/utils'

const workerManager = WorkerManager.init(
  path.resolve(__dirname, `./worker.ts`),
  {
    minWorkers: 1,
    maxWorkers: 2,
  },
  ['crawlHandler']
)

const browserManager = BrowserManager()

// Use console.error for logging
const error = (...args: any[]) => console.error('[SITEMAP ERROR]', ...args)

const HOST = PROCESS_ENV.HOST

// Use crawlWorker for URL crawling (uses worker pool with regex-based link extraction)
export const crawlWorker = async (params: ICrawlHandlerParams) => {
  if (!browserManager || !params) {
    Console.error('Need provide `params`!')
    return
  }

  const browser = await browserManager.get()

  const wsEndpoint =
    browser && browser.connected ? browser.wsEndpoint() : undefined

  if (!wsEndpoint) return

  if (!params.url) {
    Console.error('Need provide `params.url`!')
    return
  }

  const freePool = await workerManager.getFreePool()

  let result
  const pool = freePool.pool

  try {
    // Pass params without wsEndpoint since worker launches its own browser
    result = await pool.exec('crawlHandler', [
      { url: params.url, baseUrl: PROCESS_ENV.BASE_URL, wsEndpoint },
    ])
  } catch (err) {
    Console.error(err)
    result = {
      data: [],
    }
  }

  freePool.terminate({
    force: true,
  })

  return result
} // crawlWorker

const generateSitemap = async (url: string) => {
  if (!url) {
    error('No URL provided')
    return
  }

  const sitemapInfo = generateSitemapInfo(url)

  if (!sitemapInfo) {
    return
  }

  const { file, mainFile, loc, mainLoc, lastmod, changefreq, priority } =
    sitemapInfo

  saveUrlToSitemapWorker({ file, loc, lastmod, changefreq, priority })

  if (mainFile && mainLoc) {
    saveUrlToSitemapWorker({
      file: mainFile,
      loc: mainLoc,
      lastmod,
      changefreq,
      priority,
    })
  }

  const result = await crawlWorker({ url })
  const urlList = result.data || []

  if (urlList && urlList.length) {
    for (const link of urlList) {
      if (!link) continue

      await generateSitemap(link)
    }
  }
}

generateSitemap(normalizeUrl(HOST))
  .then(() => {
    handleFinishCrawlSitemap()
    process.exit(0)
  })
  .catch((err) => {
    error('Sitemap generation failed:', err)
    process.exit(1)
  })
