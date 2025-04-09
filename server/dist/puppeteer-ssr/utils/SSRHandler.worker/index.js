'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj }
}
function _optionalChain(ops) {
  let lastAccessLHS = undefined
  let value = ops[0]
  let i = 1
  while (i < ops.length) {
    const op = ops[i]
    const fn = ops[i + 1]
    i += 2
    if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) {
      return undefined
    }
    if (op === 'access' || op === 'optionalAccess') {
      lastAccessLHS = value
      value = fn(value)
    } else if (op === 'call' || op === 'optionalCall') {
      value = fn((...args) => value.call(lastAccessLHS, ...args))
      lastAccessLHS = undefined
    }
  }
  return value
}
var _path = require('path')
var _path2 = _interopRequireDefault(_path)
var _constants = require('../../../constants')
var _serverconfig = require('../../../server.config')
var _serverconfig2 = _interopRequireDefault(_serverconfig)
var _ConsoleHandler = require('../../../utils/ConsoleHandler')
var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler)
var _InitEnv = require('../../../utils/InitEnv')
var _PathHandler = require('../../../utils/PathHandler')
var _WorkerManager = require('../../../utils/WorkerManager')
var _WorkerManager2 = _interopRequireDefault(_WorkerManager)
var _BrowserManager = require('../BrowserManager')
var _BrowserManager2 = _interopRequireDefault(_BrowserManager)
var _utils = require('../CacheManager.worker/utils')
var _utils2 = _interopRequireDefault(_utils)

const { parentPort, isMainThread } = require('worker_threads')

const viewsPath = _PathHandler.getViewsPath.call(void 0)

const workerManager = _WorkerManager2.default.init(
  _path2.default.resolve(__dirname, `./worker.${_constants.resourceExtension}`),
  {
    minWorkers: 1,
    maxWorkers: 5,
  },
  ['SSRHandler']
)

const browserManager = _BrowserManager2.default.call(void 0)

const SSRHandler = async (params) => {
  if (!browserManager || !params.url) return

  const browser = await browserManager.get()

  const wsEndpoint =
    browser && browser.connected ? browser.wsEndpoint() : undefined

  if (!wsEndpoint && !_serverconfig2.default.crawler) return

  const freePool = await workerManager.getFreePool()

  const pool = freePool.pool

  let result
  const cacheManager = _utils2.default.call(void 0, params.url, viewsPath)

  try {
    result = await new Promise(async (res, rej) => {
      let html
      const timeout = setTimeout(async () => {
        if (html) {
          const tmpResult = await cacheManager.set(params.url, {
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
            baseUrl: _InitEnv.PROCESS_ENV.BASE_URL,
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
    _ConsoleHandler2.default.error(err)
  }

  const url = params.url.split('?')[0]
  _optionalChain([
    browser,
    'optionalAccess',
    (_) => _.emit,
    'call',
    (_2) => _2('closePage', url),
  ])
  if (!isMainThread) {
    parentPort.postMessage({
      name: 'closePage',
      wsEndpoint,
      url,
    })
  }

  if (!result || result.status !== 200) {
    cacheManager.remove(params.url).catch((err) => {
      _ConsoleHandler2.default.error(err)
    })
  }

  freePool.terminate({
    force: true,
    // delay: 30000,
  })

  return result
} // getData

exports.default = SSRHandler
