"use strict"; function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _workerpool = require('workerpool'); var _workerpool2 = _interopRequireDefault(_workerpool);
var _utils = require('./utils');

_workerpool2.default.worker({
	getStatus: _utils.getStatus,
	updateStatus: _utils.updateStatus,
	get: _utils.get,
	set: _utils.set,
	remove: _utils.remove,
	finish: () => {
		return 'finish'
	},
})
