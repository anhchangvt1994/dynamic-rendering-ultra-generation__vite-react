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
var _path = require('path')
var _path2 = _interopRequireDefault(_path)
var _zlib = require('zlib')
var _ConsoleHandler = require('../../../utils/ConsoleHandler')
var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler)

var _PathHandler = require('../../../utils/PathHandler')

const pagesPath = _PathHandler.getPagesPath.call(void 0)

if (!_fs2.default.existsSync(pagesPath)) {
	try {
		_fs2.default.mkdirSync(pagesPath)
		_fs2.default.mkdirSync(`${pagesPath}/info`)
	} catch (err) {
		_ConsoleHandler2.default.error(err)
	}
}

// export const regexKeyConverter =
// 	/^https?:\/\/(www\.)?|^www\.|botInfo=([^&]*)&deviceInfo=([^&]*)&localeInfo=([^&]*)&environmentInfo=([^&]*)/g
const regexKeyConverter =
	/www\.|botInfo=([^&]*)&deviceInfo=([^&]*)&localeInfo=([^&]*)&environmentInfo=([^&]*)/g
exports.regexKeyConverter = regexKeyConverter
const regexKeyConverterWithoutLocaleInfo =
	/www\.|botInfo=([^&]*)(?:\&)|localeInfo=([^&]*)(?:\&)|environmentInfo=([^&]*)/g
exports.regexKeyConverterWithoutLocaleInfo = regexKeyConverterWithoutLocaleInfo

const getKey = (url) => {
	if (!url) return

	url = url
		.replace('/?', '?')
		.replace(exports.regexKeyConverterWithoutLocaleInfo, '')
		.replace(/,"os":"([^&]*)"/, '')
		.replace(/(\?|\&)$/, '')

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

const maintainFile = _path2.default.resolve(
	__dirname,
	'../../../../maintain.html'
)

const get = async (url, options) => {
	options = options || {
		autoCreateIfEmpty: true,
	}

	if (!url) {
		_ConsoleHandler2.default.error('Need provide "url" param!')
		return
	}

	const key = exports.getKey.call(void 0, url)

	let file = `${pagesPath}/${key}.br`
	let isRaw = false

	switch (true) {
		case _fs2.default.existsSync(file):
			break
		case _fs2.default.existsSync(`${pagesPath}/${key}.renew.br`):
			file = `${pagesPath}/${key}.renew.br`
			break
		default:
			file = `${pagesPath}/${key}.raw.br`
			isRaw = true
			break
	}

	if (!_fs2.default.existsSync(file)) {
		if (!options.autoCreateIfEmpty) return

		_ConsoleHandler2.default.log(`Create file ${file}`)

		try {
			await Promise.all([
				_fs2.default.writeFileSync(file, ''),
				_fs2.default.writeFileSync(
					`${pagesPath}/info/${key}.txt`,
					url
						.replace('/?', '?')
						.replace(exports.regexKeyConverterWithoutLocaleInfo, '')
						.replace(/,"os":"([^&]*)"/, '')
						.replace(/(\?|\&)$/, '')
				),
			])
			_ConsoleHandler2.default.log(`File ${key}.br has been created.`)

			const curTime = new Date()

			return {
				file,
				response: maintainFile,
				status: 503,
				createdAt: curTime,
				updatedAt: curTime,
				requestedAt: curTime,
				ttRenderMs: 200,
				available: false,
				isInit: true,
				isRaw,
			}
		} catch (err) {
			if (err) {
				_ConsoleHandler2.default.error(err)
				return {
					ttRenderMs: 200,
					available: false,
					isInit: true,
				}
			}
		}
	}

	await exports.setRequestTimeInfo.call(void 0, file, new Date())
	const info = await exports.getFileInfo.call(void 0, file)

	if (!info || info.size === 0) {
		const curTime = new Date()
		_ConsoleHandler2.default.log(`File ${file} chưa có thông tin`)
		return {
			file,
			response: maintainFile,
			status: 503,
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
			ttRenderMs: 200,
			available: false,
			isInit:
				Date.now() -
					new Date(
						_nullishCoalesce(
							_optionalChain([info, 'optionalAccess', (_5) => _5.createdAt]),
							() => curTime
						)
					).getTime() >=
				53000,
			isRaw,
		}
	}

	_ConsoleHandler2.default.log(`File ${file} is ready!`)

	return {
		file,
		response: file,
		status: 200,
		createdAt: info.createdAt,
		updatedAt: info.updatedAt,
		requestedAt: info.requestedAt,
		ttRenderMs: 200,
		available: true,
		isInit: false,
		isRaw,
	}
}
exports.get = get // get

const set = async (
	{ html, url, isRaw } = {
		html: '',
		url: '',
		isRaw: false,
	}
) => {
	const key = exports.getKey.call(void 0, url)

	if (!html) {
		_ConsoleHandler2.default.error('Need provide "html" param')
		return
	}

	const file = `${pagesPath}/${key}${isRaw ? '.raw' : ''}.br`

	if (!isRaw) {
		if (_fs2.default.existsSync(`${pagesPath}/${key}.renew.br`))
			try {
				_fs2.default.renameSync(`${pagesPath}/${key}.renew.br`, file)
			} catch (err) {
				_ConsoleHandler2.default.error(err)
			}
		else if (_fs2.default.existsSync(`${pagesPath}/${key}.raw.br`))
			try {
				_fs2.default.renameSync(`${pagesPath}/${key}.raw.br`, file)
			} catch (err) {
				_ConsoleHandler2.default.error(err)
			}
	}

	// NOTE - If file is exist and isRaw or not disable compress process, will be created new or updated
	if (_fs2.default.existsSync(file)) {
		const contentCompression = Buffer.isBuffer(html)
			? html
			: _zlib.brotliCompressSync.call(void 0, html)

		try {
			_fs2.default.writeFileSync(file, contentCompression)
			_ConsoleHandler2.default.log(`File ${file} was updated!`)
		} catch (err) {
			_ConsoleHandler2.default.error(err)
		}
	}

	const result = (await exports.get.call(void 0, url, {
		autoCreateIfEmpty: false,
	})) || { html, status: 200 }

	return result
}
exports.set = set // set

const renew = async (url) => {
	if (!url) return _ConsoleHandler2.default.log('Url can not empty!')
	const key = exports.getKey.call(void 0, url)
	let hasRenew = true

	const file = `${pagesPath}/${key}.renew.br`

	if (!_fs2.default.existsSync(file)) {
		hasRenew = false
		const curFile = (() => {
			let tmpCurFile = `${pagesPath}/${key}.br`

			switch (true) {
				case _fs2.default.existsSync(tmpCurFile):
					break
				default:
					tmpCurFile = `${pagesPath}/${key}.raw.br`
			}

			return tmpCurFile
		})()

		try {
			_fs2.default.renameSync(curFile, file)
		} catch (err) {
			_ConsoleHandler2.default.error(err)
		}
	}

	return hasRenew
}
exports.renew = renew // renew

const remove = async (url) => {
	if (!url) return _ConsoleHandler2.default.log('Url can not empty!')
	const key = exports.getKey.call(void 0, url)

	const curFile = (() => {
		switch (true) {
			case _fs2.default.existsSync(`${pagesPath}/${key}.raw.br`):
				return `${pagesPath}/${key}.raw.br`
			case _fs2.default.existsSync(`${pagesPath}/${key}.br`):
				return `${pagesPath}/${key}.br`
			case _fs2.default.existsSync(`${pagesPath}/${key}.renew.br`):
				return `${pagesPath}/${key}.renew.br`
			default:
				return
		}
	})()

	if (!curFile) return

	try {
		await Promise.all([
			_fs2.default.unlinkSync(curFile),
			_fs2.default.unlinkSync(`${pagesPath}/info/${key}.txt`),
		])
	} catch (err) {
		_ConsoleHandler2.default.error(err)
	}
}
exports.remove = remove // remove

const rename = (params) => {
	if (!params || !params.url) {
		_ConsoleHandler2.default.log('Url can not empty!')
		return
	}

	const key = exports.getKey.call(void 0, params.url)
	const file = `${pagesPath}/${key}${params.type ? '.' + params.type : ''}.br`

	if (!_fs2.default.existsSync(file)) {
		const curFile = (() => {
			switch (true) {
				case _fs2.default.existsSync(`${pagesPath}/${key}.raw.br`):
					return `${pagesPath}/${key}.raw.br`
				case _fs2.default.existsSync(`${pagesPath}/${key}.br`):
					return `${pagesPath}/${key}.br`
				case _fs2.default.existsSync(`${pagesPath}/${key}.renew.br`):
					return `${pagesPath}/${key}.renew.br`
				default:
					return
			}
		})()

		if (!curFile) return

		try {
			_fs2.default.renameSync(curFile, file)
		} catch (err) {
			_ConsoleHandler2.default.error(err)
		}
	}
}
exports.rename = rename // rename

const isExist = (url) => {
	if (!url) {
		_ConsoleHandler2.default.log('Url can not empty!')
		return false
	}

	const key = exports.getKey.call(void 0, url)

	return (
		_fs2.default.existsSync(`${pagesPath}/${key}.raw.br`) ||
		_fs2.default.existsSync(`${pagesPath}/${key}.br`) ||
		_fs2.default.existsSync(`${pagesPath}/${key}.renew.br`)
	)
}
exports.isExist = isExist // isExist

const getStatus = (url) => {
	if (!url) {
		_ConsoleHandler2.default.log('Url can not empty!')
		return
	}

	const key = exports.getKey.call(void 0, url)

	switch (true) {
		case _fs2.default.existsSync(`${pagesPath}/${key}.raw.br`):
			return 'raw'
		case _fs2.default.existsSync(`${pagesPath}/${key}.renew.br`):
			return 'renew'
		default:
			return 'ok'
	}
}
exports.getStatus = getStatus // getStatus
