'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
function _interopRequireDefault(obj) {
	return obj && obj.__esModule ? obj : { default: obj }
}
var _fsextra = require('fs-extra')
var _fsextra2 = _interopRequireDefault(_fsextra)
var _ConsoleHandler = require('../ConsoleHandler')
var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler)

const deleteResource = (path) => {
	if (!path || !_fsextra2.default.existsSync(path)) {
		_ConsoleHandler2.default.log('Path can not empty!')
		return
	}

	try {
		_fsextra2.default.emptyDirSync(path)
		_fsextra2.default.remove(path)
	} catch (err) {
		_ConsoleHandler2.default.error(err)
	}
}
exports.deleteResource = deleteResource
