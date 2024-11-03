'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
function _interopRequireDefault(obj) {
	return obj && obj.__esModule ? obj : { default: obj }
}
var _fs = require('fs')
var _fs2 = _interopRequireDefault(_fs)

var _zlib = require('zlib')
var _constants = require('../../constants')
var _constants3 = require('../constants')

var _ConsoleHandler = require('../../utils/ConsoleHandler')
var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler)
var _InitEnv = require('../../utils/InitEnv')

const COOKIE_EXPIRED_SECOND = _constants.COOKIE_EXPIRED / 1000

const _setCookie = (res) => {
	res
		.writeHeader(
			'set-cookie',
			`EnvironmentInfo=${JSON.stringify(
				res.cookies.environmentInfo
			)};Max-Age=${COOKIE_EXPIRED_SECOND};Path=/`
		)
		.writeHeader(
			'set-cookie',
			`BotInfo=${JSON.stringify(
				res.cookies.botInfo
			)};Max-Age=${COOKIE_EXPIRED_SECOND};Path=/`
		)
		.writeHeader(
			'set-cookie',
			`DeviceInfo=${JSON.stringify(
				res.cookies.deviceInfo
			)};Max-Age=${COOKIE_EXPIRED_SECOND};Path=/`
		)
		.writeHeader(
			'set-cookie',
			`LocaleInfo=${JSON.stringify(
				res.cookies.localeInfo
			)};Max-Age=${COOKIE_EXPIRED_SECOND};Path=/`
		)

	return res
} // _setCookie

const handleResultAfterISRGenerator = (res, params) => {
	const { result, enableContentEncoding, contentEncoding } = params

	if (result) {
		// Add Server-Timing! See https://w3c.github.io/server-timing/.
		if (
			(_constants3.CACHEABLE_STATUS_CODE[result.status] ||
				result.status === 503) &&
			result.response
		) {
			try {
				const body = (() => {
					let tmpBody = ''

					if (enableContentEncoding) {
						tmpBody = result.html
							? contentEncoding === 'br'
								? _zlib.brotliCompressSync.call(void 0, result.html)
								: contentEncoding === 'gzip'
								? _zlib.gzipSync.call(void 0, result.html)
								: result.html
							: (() => {
									let tmpContent = _fs2.default.readFileSync(result.response)

									if (contentEncoding === 'br') return tmpContent
									else if (tmpContent && Buffer.isBuffer(tmpContent))
										tmpContent = _zlib.brotliDecompressSync
											.call(void 0, tmpContent)
											.toString()

									if (result.status === 200) {
										if (contentEncoding === 'gzip')
											tmpContent = _zlib.gzipSync.call(void 0, tmpContent)
									}

									return tmpContent
							  })()
					} else if (result.response.indexOf('.br') !== -1) {
						const content = _fs2.default.readFileSync(result.response)

						if (content && Buffer.isBuffer(content)) {
							tmpBody = _zlib.brotliDecompressSync
								.call(void 0, content)
								.toString()
						}
					} else {
						tmpBody = _fs2.default.readFileSync(result.response)
					}

					return tmpBody
				})()

				res
					.writeStatus(String(result.status))
					.writeHeader('Content-Type', 'text/html; charset=utf-8')

				res = _setCookie(res)

				if (enableContentEncoding && result.status === 200) {
					res.writeHeader('Content-Encoding', contentEncoding)
				}

				if (result.status === 503) res.writeHeader('Retry-After', '120')

				res.end(body, true)
			} catch (err) {
				console.log(err)
				res
					.writeStatus('504')
					.writeHeader('Content-Type', 'text/html; charset=utf-8')
					.end('504 Gateway Timeout', true)
			}
		} else if (result.html) {
			res
				.writeStatus(String(result.status))
				.writeHeader('Content-Type', 'text/html; charset=utf-8')

			if (enableContentEncoding && result.status === 200) {
				res.writeHeader('Content-Encoding', contentEncoding)
			}

			if (result.status === 200) {
				res
					.writeHeader(
						'Server-Timing',
						`Prerender;dur=50;desc="Headless render time (ms)"`
					)
					.writeHeader('Cache-Control', 'no-store')
			}

			const body = enableContentEncoding
				? _zlib.brotliCompressSync.call(void 0, result.html)
				: result.html

			res.end(body || '', true)
		} else {
			res
				.writeStatus(String(result.status))
				.writeHeader('Content-Type', 'text/html; charset=utf-8')

			// if (enableContentEncoding && result.status === 200) {
			// 	res.writeHeader('Content-Encoding', contentEncoding)
			// }
			res.end(`${result.status} Error`, true)
		}
	} else {
		res
			.writeStatus('504')
			.writeHeader('Content-Type', 'text/html; charset=utf-8')
			.end('504 Gateway Timeout', true)
	}
}
exports.handleResultAfterISRGenerator = handleResultAfterISRGenerator // handleResultAfterISRGenerator

const handleInvalidUrl = (res, req) => {
	if (!res) {
		_ConsoleHandler2.default.log('Need provide `res` param!')
		return
	}

	if (!req) {
		_ConsoleHandler2.default.log('Need provide `req` param!')
		return
	}

	const baseUrl = `${
		req.getHeader('x-forwarded-proto')
			? req.getHeader('x-forwarded-proto')
			: _InitEnv.PROCESS_ENV.IS_SERVER
			? 'https'
			: 'http'
	}://${req.getHeader('host')}`
	const url = req.getUrl()
	const urlLower = url.toLowerCase()

	switch (true) {
		case url.startsWith('/api') ||
			/^https:\/\/([0-9]{1,3}\.){3}[0-9]{1,3}(?:(\:[0-9]{1,4})$|$)/.test(
				baseUrl
			) ||
			/\/(wordpress|laravel|wp-includes|php|.env|server.config|[A-Za-z0-9-]+\.(yml))/.test(
				urlLower
			):
			res.writableEnded = true
			res.writeStatus('404').end('Not Found!', true)
			break
		default:
			res.writableEnded = false
	}
}
exports.handleInvalidUrl = handleInvalidUrl // handleInvalidUrl
