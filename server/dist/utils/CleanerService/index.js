'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
var _constants = require('../../constants')
var _InitEnv = require('../InitEnv')

var _utils = require('./utils')

let isFirstInitCompleted = false

const CleanerService = async (force = false) => {
	if (_InitEnv.ENV_MODE === 'development') return

	if (isFirstInitCompleted && !force) return

	// NOTE - Browser Cleaner
	_utils.cleanBrowsers.call(void 0)

	// NOTE - Pages Cleaner
	_utils.cleanPages.call(void 0)

	// NOTE - API Data Cache Cleaner
	_utils.cleanAPIDataCache.call(void 0)

	// NOTE - API Store Cache Cleaner
	_utils.cleanAPIStoreCache.call(void 0)

	// NOTE - Other cleaner
	_utils.cleanOther.call(void 0)

	isFirstInitCompleted = true
}

if (!_constants.SERVER_LESS) CleanerService()

exports.default = CleanerService
