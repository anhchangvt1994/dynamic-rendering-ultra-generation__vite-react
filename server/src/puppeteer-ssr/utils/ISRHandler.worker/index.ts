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
import { CRAWL_WORKERS, IS_FAST_CRAWL } from '../CrawlProfile'
import CacheManager from '../CacheManager.worker/utils'
import { type IISRHandlerWorkerParam } from './types'

const pagesPath = getPagesPath()

const { parentPort, isMainThread } = require('worker_threads')

const workerManager = WorkerManager.init(
  path.resolve(__dirname, `./worker.${resourceExtension}`),
  {
    // NOTE - Fast profile keeps all its render workers ready: starting a
    // worker thread when the crawl arrives took 2-3s on a 2 vCPU VPS
    minWorkers: IS_FAST_CRAWL ? CRAWL_WORKERS : 1,
    // NOTE - default profile: 2 (reduced from 5 to prevent EAGAIN resource
    // exhaustion), fast profile: the crawl concurrency
    maxWorkers: CRAWL_WORKERS,
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

  try {
    result = await new Promise(async (res, rej) => {
      let html
      const timeout = setTimeout(async () => {
        if (html) {
          const tmpResult = await cacheManager.set({
            html,
            isRaw: !params.hasCache,
          })

          res(tmpResult)
        } else {
          res(undefined)
        }
      }, 52000)
      try {
        const tmpResult = await pool.exec(
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
              if (!payload) return
              if (
                typeof payload === 'object' &&
                payload.name === 'html' &&
                payload.value
              ) {
                html = payload.value
              }
            },
          }
        )

        res(tmpResult)
      } catch (err) {
        rej(err)
      } finally {
        clearTimeout(timeout)
      }
    })
  } catch (err) {
    // clearTimeout(timeoutToCloseBrowserPage)
    Console.error(err)
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

  return result
} // _render

const ISRHandler = async (params: IISRHandlerWorkerParam) => {
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

export default ISRHandler
