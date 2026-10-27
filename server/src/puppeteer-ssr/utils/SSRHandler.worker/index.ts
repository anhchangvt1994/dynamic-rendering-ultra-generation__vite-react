import path from 'path'
import { resourceExtension } from '../../../constants'
import ServerConfig from '../../../server.config'
import Console from '../../../utils/ConsoleHandler'
import { PROCESS_ENV } from '../../../utils/InitEnv'
import { getViewsPath } from '../../../utils/PathHandler'
import WorkerManager from '../../../utils/WorkerManager'
import BrowserManager from '../BrowserManager'
import { CRAWL_WORKERS, RESOURCE_BUDGET, crawlGate } from '../CrawlProfile'
import CacheManager from '../CacheManager.worker/utils'
import { closeRenderTarget } from '../RenderCleanup'
import { BROWSER_ENGINE } from '../../constants'
import { ISSRHandlerWorkerParam } from './types'
const { parentPort, isMainThread } = require('worker_threads')

const viewsPath = getViewsPath()

const workerManager = WorkerManager.init(
  path.resolve(__dirname, `./worker.${resourceExtension}`),
  {
    minWorkers: 0,
    maxWorkers: CRAWL_WORKERS,
    maxQueueSize: RESOURCE_BUDGET.queueLimit,
    reuseWorkers: true,
    workerThreadOpts: {
      execArgv: process.execArgv.filter(
        (arg) => !/^--max[-_]old[-_]space[-_]size/.test(arg)
      ),
      resourceLimits: { maxOldGenerationSizeMb: RESOURCE_BUDGET.workerHeapMB },
    },
  }
)

const browserManager = BrowserManager()

const render = async (params: ISSRHandlerWorkerParam) => {
  if (!browserManager || !params.url) return

  const browser = await browserManager.get()

  const wsEndpoint =
    browser && browser.connected ? browser.wsEndpoint() : undefined

  if (!wsEndpoint && !ServerConfig.crawler) return

  const freePool = await workerManager.getFreePool()

  const pool = freePool.pool

  let result
  let targetId: string | undefined
  const cacheManager = CacheManager(params.url, viewsPath)

  try {
    result = await pool
      .exec(
        'SSRHandler',
        [
          {
            ...params,
            baseUrl: PROCESS_ENV.BASE_URL,
            wsEndpoint,
          },
        ],
        {
          on: (payload) => {
            if (payload?.name === 'page') targetId = payload.value
          },
        }
      )
      .timeout(10000)
  } catch (err) {
    Console.error(err)
    if (BROWSER_ENGINE === 'chromium')
      await closeRenderTarget(browser, targetId)
  }

  const url = params.url.split('?')[0]
  browser?.emit('closePage', url)
  if (!isMainThread) {
    parentPort.postMessage({
      name: 'closePage',
      wsEndpoint,
      url,
    })
  }

  if (!result || result.status !== 200) {
    cacheManager.remove().catch((err) => {
      Console.error(err)
    })
  }

  freePool.terminate({
    force: true,
    // delay: 30000,
  })
  if (!isMainThread && BROWSER_ENGINE === 'chromium')
    await browser?.disconnect()

  return result
} // getData

const SSRHandler = (params: ISSRHandlerWorkerParam) =>
  crawlGate
    .run(() => render(params))
    .catch(async (error) => {
      Console.error(error.message)
      await CacheManager(params.url, viewsPath).remove()
      return undefined
    })

export default SSRHandler
