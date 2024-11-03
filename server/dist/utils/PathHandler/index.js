'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
function _interopRequireDefault(obj) {
	return obj && obj.__esModule ? obj : { default: obj }
}
var _fs = require('fs')
var _fs2 = _interopRequireDefault(_fs)
var _path = require('path')
var _path2 = _interopRequireDefault(_path)
var _serverconfig = require('../../server.config')
var _serverconfig2 = _interopRequireDefault(_serverconfig)
var _ConsoleHandler = require('../ConsoleHandler')
var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler)
var _InitEnv = require('../InitEnv')

const getPagesPath = () => {
	return _InitEnv.PROCESS_ENV.IS_SERVER
		? (() => {
				let root = '/tmp'
				if (_serverconfig2.default.rootCache) {
					if (_fs2.default.existsSync(_serverconfig2.default.rootCache)) {
						root = _serverconfig2.default.rootCache
					} else {
						try {
							_fs2.default.mkdirSync(_serverconfig2.default.rootCache)
							root = _serverconfig2.default.rootCache
						} catch (err) {
							_ConsoleHandler2.default.error(err.message)
						}
					}
				}

				if (_fs2.default.existsSync(root)) return root + '/pages'

				return _path2.default.resolve(
					__dirname,
					'../../puppeteer-ssr/utils/Cache.worker/pages'
				)
		  })()
		: _path2.default.resolve(
				__dirname,
				'../../puppeteer-ssr/utils/Cache.worker/pages'
		  )
}
exports.getPagesPath = getPagesPath // getPagesPath

const getDataPath = () => {
	return _InitEnv.PROCESS_ENV.IS_SERVER
		? (() => {
				let root = '/tmp'
				if (_serverconfig2.default.rootCache) {
					if (_fs2.default.existsSync(_serverconfig2.default.rootCache)) {
						root = _serverconfig2.default.rootCache
					} else {
						try {
							_fs2.default.mkdirSync(_serverconfig2.default.rootCache)
							root = _serverconfig2.default.rootCache
						} catch (err) {
							_ConsoleHandler2.default.error(err.message)
						}
					}
				}

				if (_fs2.default.existsSync(root)) return root + '/data'

				return _path2.default.resolve(
					__dirname,
					'../../api/utils/CacheManager/data'
				)
		  })()
		: _path2.default.resolve(__dirname, '../../api/utils/CacheManager/data')
}
exports.getDataPath = getDataPath // getDataPath

const getStorePath = () => {
	return _InitEnv.PROCESS_ENV.IS_SERVER
		? (() => {
				let root = '/tmp'
				if (_serverconfig2.default.rootCache) {
					if (_fs2.default.existsSync(_serverconfig2.default.rootCache)) {
						root = _serverconfig2.default.rootCache
					} else {
						try {
							_fs2.default.mkdirSync(_serverconfig2.default.rootCache)
							root = _serverconfig2.default.rootCache
						} catch (err) {
							_ConsoleHandler2.default.error(err.message)
						}
					}
				}

				if (_fs2.default.existsSync(root)) return root + '/store'

				return _path2.default.resolve(
					__dirname,
					'../../api/utils/CacheManager/store'
				)
		  })()
		: _path2.default.resolve(__dirname, '../../api/utils/CacheManager/store')
}
exports.getStorePath = getStorePath // getStorePath

const getUserDataPath = () => {
	return _InitEnv.PROCESS_ENV.IS_SERVER
		? (() => {
				const tmpPath = '/tmp'
				if (_fs2.default.existsSync(tmpPath)) return tmpPath + '/browsers'

				return _path2.default.resolve(__dirname, '../../puppeteer-ssr/browsers')
		  })()
		: _path2.default.resolve(__dirname, '../../puppeteer-ssr/browsers')
}
exports.getUserDataPath = getUserDataPath // getUserDataPath

const getWorkerManagerPath = () => {
	return _InitEnv.PROCESS_ENV.IS_SERVER
		? (() => {
				const tmpPath = '/tmp'
				if (_fs2.default.existsSync(tmpPath)) return tmpPath + '/WorkerManager'

				return _path2.default.resolve(__dirname, '../../utils/WorkerManager')
		  })()
		: _path2.default.resolve(__dirname, '../../utils/WorkerManager')
}
exports.getWorkerManagerPath = getWorkerManagerPath // getWorkerManagerPath
