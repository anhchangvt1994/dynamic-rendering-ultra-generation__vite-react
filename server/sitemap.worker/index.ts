import path from 'path'
import { resourceExtension } from '../src/constants'
import BrowserManager from '../src/puppeteer-ssr/utils/BrowserManager'
import { PROCESS_ENV } from '../src/utils/InitEnv'
import WorkerManager from '../src/utils/WorkerManager'

const workerManager = WorkerManager.init(
  path.resolve(__dirname, `./worker.${resourceExtension}`),
  {
    minWorkers: 1,
    maxWorkers: 2, // Reduced from 5 to prevent EAGAIN resource exhaustion
    enableGlobalCounter: true,
  },
  ['ISRHandler']
)

const generateSitemap = async (url) => {
  if (!url) return

  const browserManager = BrowserManager()

  const browser = await browserManager.get()

  const wsEndpoint =
    browser && browser.connected ? browser.wsEndpoint() : undefined

  if (wsEndpoint) {
    const freePool = await workerManager.getFreePool({
      delay: 5000,
    })

    const pool = freePool.pool

    const urlList = await pool.exec('crawlHandler', [url])

    if (url && url.length) {
      for (const url in urlList) {
        if (!url) continue

        await generateSitemap(url)
      }
    }
  }
} // generateSitemap

generateSitemap(PROCESS_ENV.HOST)
