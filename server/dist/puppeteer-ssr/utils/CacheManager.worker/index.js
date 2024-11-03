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
var _fs = require('fs')
var _fs2 = _interopRequireDefault(_fs)
var _path = require('path')
var _path2 = _interopRequireDefault(_path)
var _constants = require('../../../constants')
var _serverconfig = require('../../../server.config')
var _serverconfig2 = _interopRequireDefault(_serverconfig)
var _ConsoleHandler = require('../../../utils/ConsoleHandler')
var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler)
var _WorkerManager = require('../../../utils/WorkerManager')
var _WorkerManager2 = _interopRequireDefault(_WorkerManager)

var _utils = require('../Cache.worker/utils')
var _PathHandler = require('../../../utils/PathHandler')

const pagesPath = _PathHandler.getPagesPath.call(void 0)

const workerManager = _WorkerManager2.default.init(
	_path2.default.resolve(
		__dirname,
		`./../Cache.worker/index.${_constants.resourceExtension}`
	),
	{
		minWorkers: 1,
		maxWorkers: 3,
	},
	['get', 'set', 'renew', 'remove', 'rename']
)

const maintainFile = _path2.default.resolve(__dirname, '../../../maintain.html')

const CacheManager = (url) => {
	const pathname = new URL(url).pathname

	const enableToCache =
		_serverconfig2.default.crawl.enable &&
		(_serverconfig2.default.crawl.routes[pathname] === undefined ||
			_serverconfig2.default.crawl.routes[pathname].enable ||
			_optionalChain([
				_serverconfig2.default,
				'access',
				(_) => _.crawl,
				'access',
				(_2) => _2.custom,
				'optionalCall',
				(_3) => _3(url),
			]) === undefined ||
			_optionalChain([
				_serverconfig2.default,
				'access',
				(_4) => _4.crawl,
				'access',
				(_5) => _5.custom,
				'optionalCall',
				(_6) => _6(url),
				'optionalAccess',
				(_7) => _7.enable,
			])) &&
		_serverconfig2.default.crawl.cache.enable &&
		(_serverconfig2.default.crawl.routes[pathname] === undefined ||
			_serverconfig2.default.crawl.routes[pathname].cache.enable ||
			_optionalChain([
				_serverconfig2.default,
				'access',
				(_8) => _8.crawl,
				'access',
				(_9) => _9.custom,
				'optionalCall',
				(_10) => _10(url),
			]) === undefined ||
			_optionalChain([
				_serverconfig2.default,
				'access',
				(_11) => _11.crawl,
				'access',
				(_12) => _12.custom,
				'optionalCall',
				(_13) => _13(url),
				'optionalAccess',
				(_14) => _14.cache,
				'access',
				(_15) => _15.enable,
			]))

	const get = async () => {
		if (!enableToCache)
			return {
				response: maintainFile,
				status: 503,
				createdAt: new Date(),
				updatedAt: new Date(),
				requestedAt: new Date(),
				ttRenderMs: 200,
				available: false,
				isInit: true,
			}

		const freePool = await workerManager.getFreePool()
		const pool = freePool.pool
		let result

		try {
			result = await pool.exec('get', [url])
		} catch (err) {
			_ConsoleHandler2.default.error(err)
		}

		freePool.terminate({
			force: true,
		})

		return result
	} // get

	const achieve = async () => {
		if (!enableToCache) return
		if (!url) {
			_ConsoleHandler2.default.error('Need provide "url" param!')
			return
		}

		const key = _utils.getKey.call(void 0, url)
		let file = `${pagesPath}/${key}.br`
		let isRaw = false

		switch (true) {
			case _fs2.default.existsSync(file):
				break
			case _fs2.default.existsSync(`${pagesPath}/${key}.renew.br`):
				file = `${pagesPath}/${key}.renew.br`
				break
			default:
				file = `${pagesPath}/${key}.raw.br`
				isRaw = true
				break
		}

		if (!_fs2.default.existsSync(file)) return

		const info = await _utils.getFileInfo.call(void 0, file)

		if (!info || info.size === 0) return

		// await setRequestTimeInfo(file, new Date())

		return {
			file,
			response: file,
			status: 200,
			createdAt: info.createdAt,
			updatedAt: info.updatedAt,
			requestedAt: new Date(),
			ttRenderMs: 200,
			available: true,
			isInit: false,
			isRaw,
		}
	} // achieve

	const set = async (params) => {
		if (!enableToCache)
			return {
				html: params.html,
				response: maintainFile,
				status: params.html ? 200 : 503,
			}

		const freePool = await workerManager.getFreePool()
		const pool = freePool.pool
		let result

		try {
			result = await pool.exec('set', [params])
		} catch (err) {
			_ConsoleHandler2.default.error(err)
		}

		freePool.terminate({
			force: true,
		})

		return result
	} // set

	const renew = async () => {
		const freePool = await workerManager.getFreePool()
		const pool = freePool.pool
		let result

		try {
			result = await pool.exec('renew', [url])
		} catch (err) {
			_ConsoleHandler2.default.error(err)
		}

		freePool.terminate({
			force: true,
		})

		return result
	} // renew

	const remove = async (url, options) => {
		if (!enableToCache) return

		options = {
			force: false,
			...options,
		}

		if (!options.force) {
			const tmpCacheInfo = await achieve()

			if (tmpCacheInfo) return
		}

		const freePool = await workerManager.getFreePool()
		const pool = freePool.pool

		try {
			await pool.exec('remove', [url])
		} catch (err) {
			_ConsoleHandler2.default.error(err)
		}

		freePool.terminate({
			force: true,
		})
	} // remove

	const rename = async (params) => {
		if (!enableToCache || !params || !params.url) return

		const freePool = await workerManager.getFreePool()
		const pool = freePool.pool

		try {
			await pool.exec('rename', [params])
		} catch (err) {
			_ConsoleHandler2.default.error(err)
		}

		freePool.terminate({
			force: true,
		})
	} // rename

	const getStatus = () => {
		return _utils.getStatus.call(void 0, url)
	} // getStatus

	const isExist = () => {
		return _utils.isExist.call(void 0, url)
	} // isExist

	return {
		achieve,
		get,
		getStatus,
		set,
		renew,
		remove,
		rename,
		isExist,
	}
}

exports.default = CacheManager
