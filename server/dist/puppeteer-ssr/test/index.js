"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _workerpool = require('workerpool'); var _workerpool2 = _interopRequireDefault(_workerpool);
var _constants = require('./constants');
var _constants3 = require('../../constants');

const minWorkers = 1
const maxWorkers = 10

const testPuppeteerSSRService = (() => {
	const _init = () => {
		const TestPool = _workerpool2.default.pool(
			__dirname + `/test.worker.${_constants3.resourceExtension}`,
			{
				minWorkers,
				maxWorkers,
			}
		)

		const domain = 'http://localhost:8080'
		console.log('total urls: ', _constants.urlList.length)
		console.log('max workers: ', maxWorkers)
		console.log('========================>')
		_constants.urlList.forEach(async (url) => {
			let tmpUrl = `${domain}?urlTesting=${url}`
			try {
				TestPool.exec('loadCapacityTest', [tmpUrl])
			} catch (err) {
				console.error(err)
			}
		})
	}

	return {
		init: _init,
	}
})()

testPuppeteerSSRService.init()

exports. default = testPuppeteerSSRService
