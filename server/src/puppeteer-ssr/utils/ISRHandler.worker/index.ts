import path from 'path'
import { resourceExtension } from '../../../constants'
import ServerConfig from '../../../server.config'
import Console from '../../../utils/ConsoleHandler'
import { PROCESS_ENV } from '../../../utils/InitEnv'
import { getPagesPath } from '../../../utils/PathHandler'
import WorkerManager from '../../../utils/WorkerManager'
import BrowserManager from '../BrowserManager'
import CacheManager from '../CacheManager.worker/utils'
import { type IISRHandlerWorkerParam } from './types'

const pagesPath = getPagesPath()

const { parentPort, isMainThread } = require('worker_threads')

const workerManager = WorkerManager.init(
  path.resolve(__dirname, `./worker.${resourceExtension}`),
  {
    minWorkers: 1,
    maxWorkers: 2, // Reduced from 5 to prevent EAGAIN resource exhaustion
    enableGlobalCounter: !isMainThread,
  },
  ['ISRHandler']
)

const browserManager = BrowserManager()

const ISRHandler = async (params: IISRHandlerWorkerParam) => {
  if (!browserManager || !params.url) return

  const browser = await browserManager.get()

  const wsEndpoint =
    browser && browser.connected ? browser.wsEndpoint() : undefined

  if (!wsEndpoint && !ServerConfig.crawler) return

  const pathname = new URL(params.url).pathname

  const crawlSpeedOption = (
    ServerConfig.crawl.custom?.(params.url) ??
    ServerConfig.crawl.routes[pathname] ??
    ServerConfig.crawl
  ).speed

  const freePool = await workerManager.getFreePool({
    delay: crawlSpeedOption / 20,
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

  if (!result || result.status !== 200) {
    cacheManager.remove().catch((err) => {
      Console.error(err)
    })
  }

  freePool.terminate({
    force: true,
    // delay: 30000,
  })

  return result
} // getData

export default ISRHandler
