'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
function _interopRequireDefault(obj) {
	return obj && obj.__esModule ? obj : { default: obj }
}
var _fs = require('fs')
var _fs2 = _interopRequireDefault(_fs)
var _path = require('path')
var _path2 = _interopRequireDefault(_path)
var _constants = require('../../../constants')
var _ConsoleHandler = require('../../../utils/ConsoleHandler')
var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler)
var _PathHandler = require('../../../utils/PathHandler')
var _WorkerManager = require('../../../utils/WorkerManager')
var _WorkerManager2 = _interopRequireDefault(_WorkerManager)

const dataPath = _PathHandler.getDataPath.call(void 0)
const storePath = _PathHandler.getStorePath.call(void 0)

const workerManager = _WorkerManager2.default.init(
	_path2.default.resolve(__dirname, `./worker.${_constants.resourceExtension}`),
	{
		minWorkers: 1,
		maxWorkers: 2,
	},
	['get', 'set', 'remove', 'updateStatus']
)

const getData = async (key, options) => {
	const freePool = await workerManager.getFreePool({
		delay: 150,
	})
	const pool = freePool.pool
	let result

	try {
		result = await pool.exec('get', [dataPath, key, 'br', options])

		if (result && result.status === 200) {
			result.data = _fs2.default.readFileSync(result.response)
		}
	} catch (err) {
		_ConsoleHandler2.default.error(err)
	}

	freePool.terminate({
		force: true,
	})

	return result
}
exports.getData = getData // getData

const getStore = async (key, options) => {
	const freePool = await workerManager.getFreePool()
	const pool = freePool.pool
	let result

	try {
		result = await pool.exec('get', [storePath, key, 'json', options])

		if (result && result.status === 200) {
			const tmpData = _fs2.default.readFileSync(result.response)
			result.data = tmpData ? JSON.parse(tmpData) : tmpData
		}
	} catch (err) {
		_ConsoleHandler2.default.error(err)
	}

	freePool.terminate({
		force: true,
	})

	return result
}
exports.getStore = getStore // getStore

const setData = async (key, content, options) => {
	const freePool = await workerManager.getFreePool()
	const pool = freePool.pool
	let result

	try {
		result = await pool.exec('set', [dataPath, key, 'br', content, options])
	} catch (err) {
		_ConsoleHandler2.default.error(err)
	}

	freePool.terminate({
		force: true,
	})

	return result
}
exports.setData = setData // setData

const setStore = async (key, content) => {
	const freePool = await workerManager.getFreePool()
	const pool = freePool.pool
	let result

	try {
		result = await pool.exec('set', [
			storePath,
			key,
			'json',
			content,
			{
				isCompress: false,
			},
		])
	} catch (err) {
		_ConsoleHandler2.default.error(err)
	}

	freePool.terminate({
		force: true,
	})

	return result
}
exports.setStore = setStore // setStore

const removeData = async (key) => {
	const freePool = await workerManager.getFreePool()
	const pool = freePool.pool
	let result

	try {
		result = await pool.exec('remove', [dataPath, key, 'br'])
	} catch (err) {
		_ConsoleHandler2.default.error(err)
	}

	freePool.terminate({
		force: true,
	})

	return result
}
exports.removeData = removeData // removeData

const removeStore = async (key) => {
	const freePool = await workerManager.getFreePool()
	const pool = freePool.pool
	let result

	try {
		result = await pool.exec('remove', [storePath, key])
	} catch (err) {
		_ConsoleHandler2.default.error(err)
	}

	freePool.terminate({
		force: true,
	})

	return result
}
exports.removeStore = removeStore // removeStore

const updateDataStatus = async (key, newStatus) => {
	const freePool = await workerManager.getFreePool()
	const pool = freePool.pool

	try {
		pool.exec('updateStatus', [dataPath, key, 'br', newStatus])
	} catch (err) {
		_ConsoleHandler2.default.error(err)
	}

	freePool.terminate({
		force: true,
	})
}
exports.updateDataStatus = updateDataStatus // updateDataStatus
