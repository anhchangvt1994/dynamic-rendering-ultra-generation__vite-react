"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var _path = require('path'); var _path2 = _interopRequireDefault(_path);
var _constants = require('../../../../constants');
var _BrowserManager = require('../../../../puppeteer-ssr/utils/BrowserManager'); var _BrowserManager2 = _interopRequireDefault(_BrowserManager);
var _ConsoleHandler = require('../../../../utils/ConsoleHandler'); var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler);
var _WorkerManager = require('../../../../utils/WorkerManager'); var _WorkerManager2 = _interopRequireDefault(_WorkerManager);
const { parentPort, isMainThread } = require('worker_threads')

const workerManager = _WorkerManager2.default.init(
	_path2.default.resolve(__dirname, `./worker.${_constants.resourceExtension}`),
	{
		minWorkers: 1,
		maxWorkers: 5,
		enableGlobalCounter: !isMainThread,
	},
	['runPageSpeed', 'getPageSpeedUrl']
)

const browserManager = _BrowserManager2.default.call(void 0, )

 const runPageSpeed = async (url) => {
	if (!browserManager || !url) return

	const browser = await browserManager.get()

	if (!browser || !browser.connected) return

	const wsEndpoint = browser.wsEndpoint()

	if (!wsEndpoint) return

	const freePool = await workerManager.getFreePool({
		delay: 1000,
	})

	const pool = freePool.pool
	let result

	try {
		result = await pool.exec('runPageSpeed', [url, wsEndpoint])
	} catch (err) {
		_ConsoleHandler2.default.error(err)
	}

	freePool.terminate({
		force: true,
	})

	browser.emit('closePage', url)
	if (!isMainThread) {
		parentPort.postMessage({
			name: 'closePage',
			wsEndpoint,
			url,
		})
	}

	return result
}; exports.runPageSpeed = runPageSpeed // runPageSpeed

 const getPageSpeedUrl = async (url) => {
	if (!browserManager || !url) return

	const browser = await browserManager.get()

	if (!browser || !browser.connected) return

	const wsEndpoint = browser.wsEndpoint()

	if (!wsEndpoint) return

	const freePool = await workerManager.getFreePool({
		delay: 500,
	})

	const pool = freePool.pool
	let result

	try {
		result = await pool.exec('getPageSpeedUrl', [url, wsEndpoint])
	} catch (err) {
		_ConsoleHandler2.default.error(err)
	}

	freePool.terminate({
		force: true,
	})

	browser.emit('closePage', _nullishCoalesce(_optionalChain([result, 'optionalAccess', _ => _.pageSpeedUrl]), () => ( url)))
	if (!isMainThread) {
		parentPort.postMessage({
			name: 'closePage',
			wsEndpoint,
			url,
		})
	}

	return result
}; exports.getPageSpeedUrl = getPageSpeedUrl // getPageSpeedUrl
