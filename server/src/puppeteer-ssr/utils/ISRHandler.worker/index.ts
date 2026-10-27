import path from 'path'
import { resourceExtension } from '../../../constants'
import ServerConfig from '../../../server.config'
import Console from '../../../utils/ConsoleHandler'
import { PROCESS_ENV } from '../../../utils/InitEnv'
import { getPagesPath } from '../../../utils/PathHandler'
import WorkerManager from '../../../utils/WorkerManager'
import {
  BROWSER_ENGINE,
  LIGHTPANDA_FALLBACK_TO_CHROMIUM,
  type TBrowserEngine,
} from '../../constants'
import BrowserManager from '../BrowserManager'
import {
  CRAWL_WORKERS,
  IS_FAST_CRAWL,
  RESOURCE_BUDGET,
  crawlGate,
} from '../CrawlProfile'
import CacheManager from '../CacheManager.worker/utils'
import { closeRenderTarget } from '../RenderCleanup'
import { type IISRHandlerWorkerParam } from './types'

const pagesPath = getPagesPath()

const { parentPort, isMainThread } = require('worker_threads')

const workerManager = WorkerManager.init(
  path.resolve(__dirname, `./worker.${resourceExtension}`),
  {
    minWorkers: 1,
    maxWorkers: CRAWL_WORKERS,
    maxQueueSize: RESOURCE_BUDGET.queueLimit,
    reuseWorkers: true,
    workerThreadOpts: {
      execArgv: process.execArgv.filter(
        (arg) => !/^--max[-_]old[-_]space[-_]size/.test(arg)
      ),
      resourceLimits: { maxOldGenerationSizeMb: RESOURCE_BUDGET.workerHeapMB },
    },
    enableGlobalCounter: !isMainThread,
  },
  ['ISRHandler']
)

const browserManager = BrowserManager()

const _render = async (
  params: IISRHandlerWorkerParam,
  engine: TBrowserEngine
) => {
  const manager =
    engine === BROWSER_ENGINE ? browserManager : BrowserManager({ engine })

  if (!manager) return null

  const browser = await manager.get()

  const wsEndpoint =
    browser && browser.connected ? browser.wsEndpoint() : undefined

  if (!wsEndpoint && !ServerConfig.crawler) return null

  const pathname = new URL(params.url).pathname

  const crawlSpeedOption = (
    ServerConfig.crawl.custom?.(params.url) ??
    ServerConfig.crawl.routes[pathname] ??
    ServerConfig.crawl
  ).speed

  // NOTE - Fast profile renders are cheap, no need to stagger their start
  const freePool = await workerManager.getFreePool({
    delay: IS_FAST_CRAWL ? 0 : crawlSpeedOption / 20,
  })

  const pool = freePool.pool

  let result
  const cacheManager = CacheManager(params.url, pagesPath)

  let html: string | undefined
  let targetId: string | undefined
  try {
    result = await pool
      .exec(
        'ISRHandler',
        [
          {
            ...params,
            baseUrl: PROCESS_ENV.BASE_URL,
            wsEndpoint,
            engine,
          },
        ],
        {
          on: (payload) => {
            if (payload?.name === 'html' && payload.value) html = payload.value
            if (payload?.name === 'page') targetId = payload.value
          },
        }
      )
      .timeout(52000)
  } catch (error) {
    // workerpool cancels the timed-out task, so its render permit is not
    // returned while the old worker keeps consuming CPU in the background.
    Console.error(error)
    if (browser && engine === 'chromium')
      await closeRenderTarget(browser, targetId)
    if (html) result = await cacheManager.set({ html, isRaw: !params.hasCache })
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

  freePool.terminate({
    force: true,
    // delay: 30000,
  })
  if (!isMainThread && engine === 'chromium') await browser?.disconnect()

  return result
} // _render

const render = async (params: IISRHandlerWorkerParam) => {
  if (!browserManager || !params.url) return

  let result = await _render(params, BROWSER_ENGINE)

  if (result === null) return

  if (
    BROWSER_ENGINE === 'lightpanda' &&
    LIGHTPANDA_FALLBACK_TO_CHROMIUM &&
    (!result || result.status >= 500)
  ) {
    Console.log(`Lightpanda failed, re-render with chromium: ${params.url}`)
    const fallbackResult = await _render(params, 'chromium')
    if (fallbackResult !== null) result = fallbackResult
  }

  if (!result || result.status !== 200) {
    CacheManager(params.url, pagesPath)
      .remove()
      .catch((err) => {
        Console.error(err)
      })
  }

  return result
} // ISRHandler

const ISRHandler = (params: IISRHandlerWorkerParam) =>
  crawlGate
    .run(() => render(params))
    .catch(async (error) => {
      Console.error(error.message)
      await CacheManager(params.url, pagesPath).remove()
      return undefined
    })

export default ISRHandler
