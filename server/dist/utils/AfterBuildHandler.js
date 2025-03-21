'use strict'
function _interopRequireDefault(obj) {
	return obj && obj.__esModule ? obj : { default: obj }
}
var _serverconfig = require('../server.config')
var _serverconfig2 = _interopRequireDefault(_serverconfig)
var _fsextra = require('fs-extra')
var _fsextra2 = _interopRequireDefault(_fsextra)
var _path = require('path')
var _path2 = _interopRequireDefault(_path)
var _InitEnv = require('./InitEnv')

const _getViewsPath = () => {
	const viewsPath = _InitEnv.PROCESS_ENV.IS_SERVER
		? (() => {
				let root = '/tmp'
				if (_serverconfig2.default.rootCache) {
					if (_fsextra2.default.existsSync(_serverconfig2.default.rootCache)) {
						root = _serverconfig2.default.rootCache
					} else {
						try {
							_fsextra2.default.mkdirSync(_serverconfig2.default.rootCache)
							root = _serverconfig2.default.rootCache
						} catch (err) {
							console.error(err.message)
						}
					}
				}

				if (_fsextra2.default.existsSync(root)) return root + '/views'

				return _path2.default.resolve(
					__dirname,
					'../../puppeteer-ssr/utils/Cache.worker/views'
				)
			})()
		: _path2.default.resolve(
				__dirname,
				'../../puppeteer-ssr/utils/Cache.worker/views'
			)

	if (!_fsextra2.default.existsSync(viewsPath)) {
		try {
			_fsextra2.default.mkdirSync(viewsPath)
		} catch (err) {
			console.error(err)
		}
	}

	return viewsPath
} // getViewsPath

const viewsPath = _getViewsPath()

if (_fsextra2.default.pathExistsSync(viewsPath)) {
	try {
		_fsextra2.default.emptyDirSync(viewsPath)
		_fsextra2.default.remove(viewsPath)
	} catch (err) {
		console.error(err)
	}
}
