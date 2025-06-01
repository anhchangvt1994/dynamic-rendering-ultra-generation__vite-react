"use strict"; function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _workerpool = require('workerpool'); var _workerpool2 = _interopRequireDefault(_workerpool);
var _utils = require('./utils');

_workerpool2.default.worker({
	fetchData: _utils.fetchData,
	refreshData: _utils.refreshData,
	finish: () => {
		return 'finish'
	},
})
