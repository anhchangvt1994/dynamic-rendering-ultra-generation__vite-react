'use strict'
function _interopRequireDefault(obj) {
	return obj && obj.__esModule ? obj : { default: obj }
}
var _workerpool = require('workerpool')
var _workerpool2 = _interopRequireDefault(_workerpool)
var _utils = require('./utils')

_workerpool2.default.worker({
	get: _utils.get,
	set: _utils.set,
	renew: _utils.renew,
	remove: _utils.remove,
	rename: _utils.rename,
	isExist: _utils.isExist,
	getStatus: _utils.getStatus,
	finish: () => {
		return 'finish'
	},
})
