'use strict'
function _interopRequireDefault(obj) {
	return obj && obj.__esModule ? obj : { default: obj }
}
var _workerpool = require('workerpool')
var _workerpool2 = _interopRequireDefault(_workerpool)

var _utils = require('./utils')

_workerpool2.default.worker({
	compressContent: _utils.compressContent,
	optimizeContent: _utils.optimizeContent,
	shallowOptimizeContent: _utils.shallowOptimizeContent,
	scriptOptimizeContent: _utils.scriptOptimizeContent,
	styleOptimizeContent: _utils.styleOptimizeContent,
	deepOptimizeContent: _utils.deepOptimizeContent,
	lowOptimizeContent: _utils.lowOptimizeContent,
	finish: () => {
		return 'finish'
	},
})
