'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
function _interopRequireDefault(obj) {
	return obj && obj.__esModule ? obj : { default: obj }
}
function _nullishCoalesce(lhs, rhsFn) {
	if (lhs != null) {
		return lhs
	} else {
		return rhsFn()
	}
}
function _optionalChain(ops) {
	let lastAccessLHS = undefined
	let value = ops[0]
	let i = 1
	while (i < ops.length) {
		const op = ops[i]
		const fn = ops[i + 1]
		i += 2
		if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) {
			return undefined
		}
		if (op === 'access' || op === 'optionalAccess') {
			lastAccessLHS = value
			value = fn(value)
		} else if (op === 'call' || op === 'optionalCall') {
			value = fn((...args) => value.call(lastAccessLHS, ...args))
			lastAccessLHS = undefined
		}
	}
	return value
}
var _crypto = require('crypto')
var _crypto2 = _interopRequireDefault(_crypto)
var _fs = require('fs')
var _fs2 = _interopRequireDefault(_fs)
var _zlib = require('zlib')
var _ConsoleHandler = require('../../../utils/ConsoleHandler')
var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler)
var _PathHandler = require('../../../utils/PathHandler')

const dataPath = _PathHandler.getDataPath.call(void 0)
const storePath = _PathHandler.getStorePath.call(void 0)

if (!_fs2.default.existsSync(dataPath)) {
	_fs2.default.mkdirSync(dataPath)
}

if (!_fs2.default.existsSync(storePath)) {
	_fs2.default.mkdirSync(storePath)
}

const regexKeyConverter =
	/^https?:\/\/(www\.)?|^www\.|botInfo=([^&]*)&deviceInfo=([^&]*)&localeInfo=([^&]*)&environmentInfo=([^&]*)/g
exports.regexKeyConverter = regexKeyConverter

const getKey = (url) => {
	if (!url) {
		_ConsoleHandler2.default.error('Need provide "url" param!')
		return
	}

	url = url
		.replace('/?', '?')
		.replace(exports.regexKeyConverter, '')
		.replace(/\?(?:\&|)$/g, '')
	return _crypto2.default.createHash('md5').update(url).digest('hex')
}
exports.getKey = getKey // getKey

const getFileInfo = async (file) => {
	if (!file) {
		_ConsoleHandler2.default.error('Need provide "file" param!')
		return
	}

	const result = await new Promise((res) => {
		_fs2.default.stat(file, (err, stats) => {
			if (err) {
				_ConsoleHandler2.default.error(err)
				res(undefined)
				return
			}

			res({
				size: stats.size,
				createdAt: stats.birthtime,
				updatedAt: stats.mtimeMs > stats.ctimeMs ? stats.mtime : stats.ctime,
				requestedAt: stats.atime,
			})
		})
	})

	return result
}
exports.getFileInfo = getFileInfo // getFileInfo

const setRequestTimeInfo = async (file, value) => {
	if (!file || !_fs2.default.existsSync(file)) {
		_ConsoleHandler2.default.error('File does not exist!')
		return
	}

	let stats
	try {
		stats = _fs2.default.statSync(file)
	} catch (err) {
		_ConsoleHandler2.default.error(err)
	}

	try {
		const info = await exports.getFileInfo.call(void 0, file)
		_ConsoleHandler2.default.log('file info', info)
		const fd = _fs2.default.openSync(file, 'r')
		_fs2.default.futimesSync(
			fd,
			value,
			_nullishCoalesce(
				_optionalChain([info, 'optionalAccess', (_) => _.updatedAt]),
				() => new Date()
			)
		)
		_fs2.default.close(fd)
		_ConsoleHandler2.default.log('File access time updated.')
	} catch (err) {
		_ConsoleHandler2.default.error(err)
	}
}
exports.setRequestTimeInfo = setRequestTimeInfo // setRequestTimeInfo

const getStatus = (directory, key, extension) => {
	switch (true) {
		case _fs2.default.existsSync(`${directory}/${key}.${extension}`):
			return 'ready'
		case _fs2.default.existsSync(`${directory}/${key}.fetch.${extension}`):
			return 'fetch'
		default:
			return
	}
}
exports.getStatus = getStatus // getStatus

const updateStatus = (directory, key, extension, newStatus) => {
	const status = exports.getStatus.call(void 0, directory, key, extension)

	const file = `${directory}/${key}${
		!status || status === 'ready' ? '' : '.' + status
	}.${extension}`
	const newFile = `${directory}/${key}${
		!newStatus || newStatus === 'ready' ? '' : '.' + newStatus
	}.${extension}`

	if (file !== newFile) _fs2.default.rename(file, newFile, () => {})
}
exports.updateStatus = updateStatus // updateStatus

const get = async (directory, key, extension, options) => {
	options = {
		autoCreateIfEmpty: {
			enable: false,
		},
		...(options || {}),
	}

	if (!directory) {
		_ConsoleHandler2.default.error('Need provide "directory" param!')
		return
	}

	if (!key) {
		_ConsoleHandler2.default.error('Need provide "key" param!')
		return
	}

	const status = exports.getStatus.call(void 0, directory, key, extension)
	const file = `${directory}/${key}${
		!status || status === 'ready'
			? !options.autoCreateIfEmpty.status ||
			  options.autoCreateIfEmpty.status === 'ready'
				? ''
				: '.' + options.autoCreateIfEmpty.status
			: '.' + status
	}.${extension}`

	if (!status) {
		if (!options.autoCreateIfEmpty.enable) return

		_ConsoleHandler2.default.log(`Create file ${file}`)

		try {
			_fs2.default.writeFileSync(file, '')
			_ConsoleHandler2.default.log(`File ${key}.br has been created.`)

			const curTime = new Date()

			return {
				createdAt: curTime,
				updatedAt: curTime,
				requestedAt: curTime,
				status: status || options.autoCreateIfEmpty.status,
			}
		} catch (err) {
			_ConsoleHandler2.default.error(err)
			return
		}
	}

	await exports.setRequestTimeInfo.call(void 0, file, new Date())
	const info = await exports.getFileInfo.call(void 0, file)

	if (!info || info.size === 0) {
		const curTime = new Date()
		_ConsoleHandler2.default.log(`File ${file} is empty`)
		return {
			createdAt: _nullishCoalesce(
				_optionalChain([info, 'optionalAccess', (_2) => _2.createdAt]),
				() => curTime
			),
			updatedAt: _nullishCoalesce(
				_optionalChain([info, 'optionalAccess', (_3) => _3.updatedAt]),
				() => curTime
			),
			requestedAt: _nullishCoalesce(
				_optionalChain([info, 'optionalAccess', (_4) => _4.requestedAt]),
				() => curTime
			),
			status: status || options.autoCreateIfEmpty.status,
		}
	}

	_ConsoleHandler2.default.log(`File ${file} is ready!`)

	const content = (() => {
		let tmpContent = _fs2.default.readFileSync(file)

		if (extension === 'br') {
			tmpContent = _zlib.brotliDecompressSync
				.call(void 0, tmpContent)
				.toString()
		} else tmpContent = tmpContent.toString('utf8')

		return JSON.parse(tmpContent)
	})()

	const objContent =
		!content || Array.isArray(content)
			? {
					data: content,
			  }
			: content

	return {
		createdAt: info.createdAt,
		updatedAt: info.updatedAt,
		requestedAt: info.requestedAt,
		status: status || options.autoCreateIfEmpty.status,
		...objContent,
	}
}
exports.get = get // get

const set = async (directory, key, extension, content, options) => {
	if (!directory) {
		_ConsoleHandler2.default.error('Need provide "directory" param')
		return
	}

	if (!key) {
		_ConsoleHandler2.default.error('Need provide "key" param')
		return
	}

	options = {
		isCompress: true,
		status: 'ready',
		...(options ? options : {}),
	}

	const status = exports.getStatus.call(void 0, directory, key, extension)
	const file = `${directory}/${key}${
		!status || status === 'ready' ? '' : '.' + status
	}.${extension}`

	// NOTE - If file is exist and isInit or not disable compress process, will be created new or updated
	const contentToSave = (() => {
		const contentToString =
			typeof content === 'string' || content instanceof Buffer
				? content
				: JSON.stringify(content)

		if (options.isCompress) {
			return Buffer.isBuffer(content)
				? content
				: _zlib.brotliCompressSync.call(void 0, contentToString)
		}

		return contentToString
	})()

	try {
		_fs2.default.writeFileSync(file, contentToSave)
		const fileTarget = `${directory}/${key}${
			!options.status || options.status === 'ready' ? '' : '.' + options.status
		}.${extension}`

		if (file !== fileTarget) _fs2.default.renameSync(file, fileTarget)
		_ConsoleHandler2.default.log(`File ${file} was updated!`)
	} catch (err) {
		_ConsoleHandler2.default.error(err)
		return
	}

	const result =
		(await exports.get.call(void 0, directory, key, extension, {
			autoCreateIfEmpty: {
				enable: false,
			},
		})) ||
		(() => {
			const curTime = new Date()
			return {
				createdAt: curTime,
				updatedAt: curTime,
				requestedAt: curTime,
				status: options.status,
				...(typeof content === 'string'
					? {
							cache: content,
					  }
					: content),
			}
		})()

	return result
}
exports.set = set // set

const remove = (directory, key, extension) => {
	if (!directory)
		return _ConsoleHandler2.default.log('Key param can not empty!')
	if (!key) return _ConsoleHandler2.default.log('Key param can not empty!')

	const status = exports.getStatus.call(void 0, directory, key, extension)
	const file = `${directory}/${key}${
		!status || status === 'ready' ? '' : '.' + status
	}.${extension}`

	if (!_fs2.default.existsSync(file)) return

	try {
		_fs2.default.unlinkSync(file)
	} catch (err) {
		_ConsoleHandler2.default.error(err)
	}
}
exports.remove = remove // remove

const getData = async (key, options) => {
	let result

	try {
		result = await exports.get.call(void 0, dataPath, key, 'br', options)

		if (result && result.status === 200) {
			result.data = _fs2.default.readFileSync(result.response)
		}
	} catch (err) {
		_ConsoleHandler2.default.error(err)
	}

	return result
}
exports.getData = getData // getData

const getStore = async (key, options) => {
	let result

	try {
		result = await exports.get.call(void 0, storePath, key, 'json', options)

		if (result && result.status === 200) {
			const tmpData = _fs2.default.readFileSync(result.response)
			result.data = tmpData ? JSON.parse(tmpData) : tmpData
		}
	} catch (err) {
		_ConsoleHandler2.default.error(err)
	}

	return result
}
exports.getStore = getStore // getStore

const setData = async (key, content, options) => {
	let result

	try {
		result = await exports.set.call(
			void 0,
			dataPath,
			key,
			'br',
			content,
			options
		)
	} catch (err) {
		_ConsoleHandler2.default.error(err)
	}

	return result
}
exports.setData = setData // setData

const setStore = async (key, content) => {
	let result

	try {
		result = await exports.set.call(void 0, storePath, key, 'json', content, {
			isCompress: false,
		})
	} catch (err) {
		_ConsoleHandler2.default.error(err)
	}

	return result
}
exports.setStore = setStore // setStore

const removeData = async (key) => {
	let result

	try {
		result = await exports.remove.call(void 0, dataPath, key, 'br')
	} catch (err) {
		_ConsoleHandler2.default.error(err)
	}

	return result
}
exports.removeData = removeData // removeData

const removeStore = async (key) => {
	let result

	try {
		result = await exports.remove.call(void 0, storePath, key, 'json')
	} catch (err) {
		_ConsoleHandler2.default.error(err)
	}

	return result
}
exports.removeStore = removeStore // removeStore

const updateDataStatus = async (key, newStatus) => {
	try {
		exports.updateStatus.call(void 0, dataPath, key, 'br', newStatus)
	} catch (err) {
		_ConsoleHandler2.default.error(err)
	}
}
exports.updateDataStatus = updateDataStatus // updateDataStatus
