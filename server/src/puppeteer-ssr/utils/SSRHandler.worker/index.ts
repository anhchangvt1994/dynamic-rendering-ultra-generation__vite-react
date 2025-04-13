import path from 'path'
import { resourceExtension } from '../../../constants'
import ServerConfig from '../../../server.config'
import Console from '../../../utils/ConsoleHandler'
import { PROCESS_ENV } from '../../../utils/InitEnv'
import { getViewsPath } from '../../../utils/PathHandler'
import WorkerManager from '../../../utils/WorkerManager'
import BrowserManager from '../BrowserManager'
import CacheManager from '../CacheManager.worker/utils'
import { ISSRHandlerWorkerParam } from './types'
const { parentPort, isMainThread } = require('worker_threads')

const viewsPath = getViewsPath()

const workerManager = WorkerManager.init(
  path.resolve(__dirname, `./worker.${resourceExtension}`),
  {
    minWorkers: 1,
    maxWorkers: 5,
  },
  ['SSRHandler']
)

const browserManager = BrowserManager()

const SSRHandler = async (params: ISSRHandlerWorkerParam) => {
  if (!browserManager || !params.url) return

  const browser = await browserManager.get()

  const wsEndpoint =
    browser && browser.connected ? browser.wsEndpoint() : undefined

  if (!wsEndpoint && !ServerConfig.crawler) return

  const freePool = await workerManager.getFreePool()

  const pool = freePool.pool

  let result
  const cacheManager = CacheManager(params.url, viewsPath)

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
      }, 10000)
      try {
        const tmpResult = await pool.exec('SSRHandler', [
          {
            ...params,
            baseUrl: PROCESS_ENV.BASE_URL,
            wsEndpoint,
          },
        ])

        res(tmpResult)
      } catch (err) {
        rej(err)
      } finally {
        clearTimeout(timeout)
      }
    })
  } catch (err) {
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

export default SSRHandler
