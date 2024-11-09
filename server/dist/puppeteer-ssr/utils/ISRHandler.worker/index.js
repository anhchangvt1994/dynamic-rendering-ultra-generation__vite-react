'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
function _interopRequireDefault(obj) {
	return obj && obj.__esModule ? obj : { default: obj }
}
function _nullishCoalesce(lhs, rhsFn) {
	if (lhs != null) {
		return lhs
	} else {
		return rhsFn()
	}
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
var _ConsoleHandler = require('../../../utils/ConsoleHandler')
var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler)
var _WorkerManager = require('../../../utils/WorkerManager')
var _WorkerManager2 = _interopRequireDefault(_WorkerManager)
var _BrowserManager = require('../BrowserManager')
var _BrowserManager2 = _interopRequireDefault(_BrowserManager)
var _utils = require('../CacheManager.worker/utils')
var _utils2 = _interopRequireDefault(_utils)

var _serverconfig = require('../../../server.config')
var _serverconfig2 = _interopRequireDefault(_serverconfig)
var _InitEnv = require('../../../utils/InitEnv')
const { parentPort, isMainThread } = require('worker_threads')

const workerManager = _WorkerManager2.default.init(
	_path2.default.resolve(__dirname, `./worker.${_constants.resourceExtension}`),
	{
		minWorkers: 1,
		maxWorkers: 5,
		enableGlobalCounter: !isMainThread,
	},
	['ISRHandler']
)

const browserManager = _BrowserManager2.default.call(void 0)

const ISRHandler = async (params) => {
	if (!browserManager || !params.url) return

	const browser = await browserManager.get()

	const wsEndpoint =
		browser && browser.connected ? browser.wsEndpoint() : undefined

	if (!wsEndpoint && !_serverconfig2.default.crawler) return

	const pathname = new URL(params.url).pathname

	const crawlSpeedOption = _nullishCoalesce(
		_nullishCoalesce(
			_optionalChain([
				_serverconfig2.default,
				'access',
				(_) => _.crawl,
				'access',
				(_2) => _2.custom,
				'optionalCall',
				(_3) => _3(params.url),
			]),
			() => _serverconfig2.default.crawl.routes[pathname]
		),
		() => _serverconfig2.default.crawl
	).speed

	const freePool = await workerManager.getFreePool({
		delay: crawlSpeedOption / 20,
	})

	const pool = freePool.pool

	let result
	const cacheManager = _utils2.default.call(void 0, params.url)

	try {
		result = await new Promise(async (res, rej) => {
			let html
			const timeout = setTimeout(async () => {
				if (html) {
					const tmpResult = await cacheManager.set({
						html,
						url: params.url,
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
							baseUrl: _InitEnv.PROCESS_ENV.BASE_URL,
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
		_ConsoleHandler2.default.error(err)
	}

	const url = params.url.split('?')[0]
	_optionalChain([
		browser,
		'optionalAccess',
		(_4) => _4.emit,
		'call',
		(_5) => _5('closePage', url),
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

exports.default = ISRHandler
