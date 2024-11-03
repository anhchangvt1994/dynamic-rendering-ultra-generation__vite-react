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

var _InitEnv = require('../../utils/InitEnv')
var _serverconfig = require('../../server.config')
var _serverconfig2 = _interopRequireDefault(_serverconfig)

const convertUrlHeaderToQueryString = (url, res, simulateBot = false) => {
	if (!url) return ''

	let botInfoStringify

	if (simulateBot) {
		botInfoStringify = JSON.stringify({
			isBot: true,
			name: 'puppeteer-ssr',
		})
	} else {
		botInfoStringify = JSON.stringify(
			_optionalChain([
				res,
				'access',
				(_) => _.cookies,
				'optionalAccess',
				(_2) => _2.botInfo,
			])
		)
	}

	const deviceInfo = _nullishCoalesce(
		_optionalChain([
			res,
			'access',
			(_3) => _3.cookies,
			'optionalAccess',
			(_4) => _4.deviceInfo,
		]),
		() => ({})
	)
	const deviceType =
		_serverconfig2.default.crawl.content === 'all' ||
		_serverconfig2.default.crawl.content.includes(deviceInfo.type)
			? deviceInfo.type
			: _serverconfig2.default.crawl.content[0]

	const deviceInfoStringify = JSON.stringify({
		..._nullishCoalesce(
			_optionalChain([
				res,
				'access',
				(_5) => _5.cookies,
				'optionalAccess',
				(_6) => _6.deviceInfo,
			]),
			() => ({})
		),
		isMobile: deviceInfo.isMobile && deviceType !== 'desktop' ? true : false,
		type: deviceType,
	})

	const localeInfoStringify = JSON.stringify(
		_optionalChain([
			res,
			'access',
			(_7) => _7.cookies,
			'optionalAccess',
			(_8) => _8.localeInfo,
		])
	)
	const environmentInfoStringify = JSON.stringify(
		_optionalChain([
			res,
			'access',
			(_9) => _9.cookies,
			'optionalAccess',
			(_10) => _10.environmentInfo,
		])
	)

	let urlFormatted = `${url}${
		url.indexOf('?') === -1 ? '?' : '&'
	}botInfo=${botInfoStringify}&deviceInfo=${deviceInfoStringify}&localeInfo=${localeInfoStringify}&environmentInfo=${environmentInfoStringify}`.trim()

	return urlFormatted
}
exports.convertUrlHeaderToQueryString = convertUrlHeaderToQueryString // formatUrl

const getUrl = (res, req) => {
	if (!res) return ''

	const pathname = res.urlForCrawler

	return (
		(_InitEnv.PROCESS_ENV.ENABLE_URL_TESTING
			? req.getQuery('urlTesting')
			: '') ||
		req.getQuery('url') ||
		_InitEnv.PROCESS_ENV.BASE_URL + pathname
	).trim()
}
exports.getUrl = getUrl // getUrl

const getPathname = (res, req) => {
	if (!res || !req) return

	return res.urlForCrawler || req.getUrl()
}
exports.getPathname = getPathname // getPathname
