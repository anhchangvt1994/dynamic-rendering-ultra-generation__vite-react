'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
function _interopRequireDefault(obj) {
	return obj && obj.__esModule ? obj : { default: obj }
}
var _chromiummin = require('@sparticuz/chromium-min')
var _chromiummin2 = _interopRequireDefault(_chromiummin)
var _path = require('path')
var _path2 = _interopRequireDefault(_path)
var _constants = require('../../constants')

var _constants3 = require('../../puppeteer-ssr/constants')
var _store = require('../../store')
var _ConsoleHandler = require('../ConsoleHandler')
var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler)
var _InitEnv = require('../InitEnv')

var _PathHandler = require('../PathHandler')
var _WorkerManager = require('../WorkerManager')
var _WorkerManager2 = _interopRequireDefault(_WorkerManager)

const pagesPath = _PathHandler.getPagesPath.call(void 0)
const dataPath = _PathHandler.getDataPath.call(void 0)
const storePath = _PathHandler.getStorePath.call(void 0)
const userDataPath = _PathHandler.getUserDataPath.call(void 0)
const workerManagerPath = _PathHandler.getWorkerManagerPath.call(void 0)

const { isMainThread } = require('worker_threads')

const workerManager = (() => {
	if (!isMainThread) return
	return _WorkerManager2.default.init(
		_path2.default.resolve(
			__dirname,
			`../FollowResource.worker/index.${_constants.resourceExtension}`
		),
		{
			minWorkers: 1,
			maxWorkers: 5,
		},
		[
			'scanToCleanBrowsers',
			'scanToCleanPages',
			'scanToCleanAPIDataCache',
			'deleteResource',
		]
	)
})()

const cleanBrowsers = (() => {
	let executablePath
	return async (
		expiredTime = _InitEnv.PROCESS_ENV.RESET_RESOURCE
			? 0
			: process.env.MODE === 'development'
			? 0
			: 60
	) => {
		if (!isMainThread || process.env.DISABLE_INTERNAL_CRAWLER || !workerManager)
			return

		const browserStore = (() => {
			const tmpBrowserStore = _store.getStore.call(void 0, 'browser')
			return tmpBrowserStore || {}
		})()
		const promiseStore = (() => {
			const tmpPromiseStore = _store.getStore.call(void 0, 'promise')
			return tmpPromiseStore || {}
		})()

		if (_constants3.canUseLinuxChromium && !promiseStore.executablePath) {
			_ConsoleHandler2.default.log('Create executablePath')
			promiseStore.executablePath = _chromiummin2.default.executablePath(
				_constants3.chromiumPath
			)
		}

		_store.setStore.call(void 0, 'browser', browserStore)
		_store.setStore.call(void 0, 'promise', promiseStore)

		if (!executablePath && promiseStore.executablePath) {
			executablePath = await promiseStore.executablePath
		}

		const freePool = await workerManager.getFreePool()
		const pool = freePool.pool

		browserStore.executablePath = executablePath

		try {
			await pool.exec('scanToCleanBrowsers', [
				userDataPath,
				expiredTime,
				browserStore,
			])
		} catch (err) {
			_ConsoleHandler2.default.error(err)
		}

		freePool.terminate({
			force: true,
		})

		if (!_constants.SERVER_LESS)
			setTimeout(() => {
				exports.cleanBrowsers.call(void 0, 5)
			}, 300000)
	}
})()
exports.cleanBrowsers = cleanBrowsers // cleanBrowsers

const cleanPages = (() => {
	return async () => {
		if (!isMainThread || !workerManager) return

		const freePool = await workerManager.getFreePool()
		const pool = freePool.pool

		try {
			await pool.exec('scanToCleanPages', [pagesPath])
		} catch (err) {
			_ConsoleHandler2.default.error(err)
		}

		freePool.terminate({
			force: true,
		})

		if (!_constants.SERVER_LESS) {
			setTimeout(() => {
				exports.cleanPages.call(void 0)
			}, 1800000)
		}
	}
})()
exports.cleanPages = cleanPages // cleanPages

const cleanAPIDataCache = (() => {
	return async () => {
		if (!isMainThread || !workerManager) return

		const freePool = await workerManager.getFreePool()
		const pool = freePool.pool

		try {
			await pool.exec('scanToCleanAPIDataCache', [dataPath])
		} catch (err) {
			_ConsoleHandler2.default.error(err)
		}

		freePool.terminate({
			force: true,
		})

		if (!_constants.SERVER_LESS) {
			setTimeout(() => {
				exports.cleanAPIDataCache.call(void 0)
			}, 30000)
		}
	}
})()
exports.cleanAPIDataCache = cleanAPIDataCache // cleanAPIDataCache

const cleanAPIStoreCache = (() => {
	return async () => {
		if (!isMainThread || !workerManager) return

		const freePool = await workerManager.getFreePool()
		const pool = freePool.pool

		try {
			await pool.exec('scanToCleanAPIStoreCache', [storePath])
		} catch (err) {
			_ConsoleHandler2.default.error(err)
		}

		freePool.terminate({
			force: true,
		})

		if (!_constants.SERVER_LESS) {
			setTimeout(() => {
				exports.cleanAPIStoreCache.call(void 0)
			}, 30000)
		}
	}
})()
exports.cleanAPIStoreCache = cleanAPIStoreCache // cleanAPIStoreCache

const cleanOther = (() => {
	return async () => {
		if (!isMainThread || !workerManager) return

		const clean = async (path) => {
			if (!path) return

			const freePool = await workerManager.getFreePool()
			const pool = freePool.pool

			try {
				pool.exec('deleteResource', [path])
			} catch (err) {
				_ConsoleHandler2.default.error(err)
			}

			freePool.terminate({
				force: true,
			})
		}

		try {
			await Promise.all([
				clean(`${userDataPath}/wsEndpoint.txt`),
				clean(`${workerManagerPath}/counter.txt`),
			])
		} catch (err) {
			_ConsoleHandler2.default.error(err)
		}
	}
})()
exports.cleanOther = cleanOther
