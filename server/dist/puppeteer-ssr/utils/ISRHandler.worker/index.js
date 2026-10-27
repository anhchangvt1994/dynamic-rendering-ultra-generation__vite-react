"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var _path = require('path'); var _path2 = _interopRequireDefault(_path);
var _constants = require('../../../constants');
var _serverconfig = require('../../../server.config'); var _serverconfig2 = _interopRequireDefault(_serverconfig);
var _ConsoleHandler = require('../../../utils/ConsoleHandler'); var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler);
var _InitEnv = require('../../../utils/InitEnv');
var _PathHandler = require('../../../utils/PathHandler');
var _WorkerManager = require('../../../utils/WorkerManager'); var _WorkerManager2 = _interopRequireDefault(_WorkerManager);




var _constants3 = require('../../constants');
var _BrowserManager = require('../BrowserManager'); var _BrowserManager2 = _interopRequireDefault(_BrowserManager);





var _CrawlProfile = require('../CrawlProfile');
var _utils = require('../CacheManager.worker/utils'); var _utils2 = _interopRequireDefault(_utils);
var _RenderCleanup = require('../RenderCleanup');


const pagesPath = _PathHandler.getPagesPath.call(void 0, )

const { parentPort, isMainThread } = require('worker_threads')

const workerManager = _WorkerManager2.default.init(
  _path2.default.resolve(__dirname, `./worker.${_constants.resourceExtension}`),
  {
    minWorkers: 1,
    maxWorkers: _CrawlProfile.CRAWL_WORKERS,
    maxQueueSize: _CrawlProfile.RESOURCE_BUDGET.queueLimit,
    reuseWorkers: true,
    workerThreadOpts: {
      execArgv: process.execArgv.filter(
        (arg) => !/^--max[-_]old[-_]space[-_]size/.test(arg)
      ),
      resourceLimits: { maxOldGenerationSizeMb: _CrawlProfile.RESOURCE_BUDGET.workerHeapMB },
    },
    enableGlobalCounter: !isMainThread,
  },
  ['ISRHandler']
)

const browserManager = _BrowserManager2.default.call(void 0, )

const _render = async (
  params,
  engine
) => {
  const manager =
    engine === _constants3.BROWSER_ENGINE ? browserManager : _BrowserManager2.default.call(void 0, { engine })

  if (!manager) return null

  const browser = await manager.get()

  const wsEndpoint =
    browser && browser.connected ? browser.wsEndpoint() : undefined

  if (!wsEndpoint && !_serverconfig2.default.crawler) return null

  const pathname = new URL(params.url).pathname

  const crawlSpeedOption = (
    _nullishCoalesce(_nullishCoalesce(_optionalChain([_serverconfig2.default, 'access', _ => _.crawl, 'access', _2 => _2.custom, 'optionalCall', _3 => _3(params.url)]), () => (
    _serverconfig2.default.crawl.routes[pathname])), () => (
    _serverconfig2.default.crawl))
  ).speed

  // NOTE - Fast profile renders are cheap, no need to stagger their start
  const freePool = await workerManager.getFreePool({
    delay: _CrawlProfile.IS_FAST_CRAWL ? 0 : crawlSpeedOption / 20,
  })

  const pool = freePool.pool

  let result
  const cacheManager = _utils2.default.call(void 0, params.url, pagesPath)

  let html
  let targetId
  try {
    result = await pool
      .exec(
        'ISRHandler',
        [
          {
            ...params,
            baseUrl: _InitEnv.PROCESS_ENV.BASE_URL,
            wsEndpoint,
            engine,
          },
        ],
        {
          on: (payload) => {
            if (_optionalChain([payload, 'optionalAccess', _4 => _4.name]) === 'html' && payload.value) html = payload.value
            if (_optionalChain([payload, 'optionalAccess', _5 => _5.name]) === 'page') targetId = payload.value
          },
        }
      )
      .timeout(52000)
  } catch (error) {
    // workerpool cancels the timed-out task, so its render permit is not
    // returned while the old worker keeps consuming CPU in the background.
    _ConsoleHandler2.default.error(error)
    if (browser && engine === 'chromium')
      await _RenderCleanup.closeRenderTarget.call(void 0, browser, targetId)
    if (html) result = await cacheManager.set({ html, isRaw: !params.hasCache })
  }

  const url = params.url.split('?')[0]
  _optionalChain([browser, 'optionalAccess', _6 => _6.emit, 'call', _7 => _7('closePage', url)])
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
  if (!isMainThread && engine === 'chromium') await _optionalChain([browser, 'optionalAccess', _8 => _8.disconnect, 'call', _9 => _9()])

  return result
} // _render

const render = async (params) => {
  if (!browserManager || !params.url) return

  let result = await _render(params, _constants3.BROWSER_ENGINE)

  if (result === null) return

  if (
    _constants3.BROWSER_ENGINE === 'lightpanda' &&
    _constants3.LIGHTPANDA_FALLBACK_TO_CHROMIUM &&
    (!result || result.status >= 500)
  ) {
    _ConsoleHandler2.default.log(`Lightpanda failed, re-render with chromium: ${params.url}`)
    const fallbackResult = await _render(params, 'chromium')
    if (fallbackResult !== null) result = fallbackResult
  }

  if (!result || result.status !== 200) {
    _utils2.default.call(void 0, params.url, pagesPath)
      .remove()
      .catch((err) => {
        _ConsoleHandler2.default.error(err)
      })
  }

  return result
} // ISRHandler

const ISRHandler = (params) =>
  _CrawlProfile.crawlGate
    .run(() => render(params))
    .catch(async (error) => {
      _ConsoleHandler2.default.error(error.message)
      await _utils2.default.call(void 0, params.url, pagesPath).remove()
      return undefined
    })

exports. default = ISRHandler
