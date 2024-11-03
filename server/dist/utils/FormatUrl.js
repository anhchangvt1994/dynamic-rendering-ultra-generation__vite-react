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

var _CookieHandler = require('./CookieHandler')
var _InitEnv = require('./InitEnv')
var _serverconfig = require('../server.config')
var _serverconfig2 = _interopRequireDefault(_serverconfig)

const convertUrlHeaderToQueryString = (url, res, simulateBot = false) => {
	if (!url) return ''

	const cookies = _CookieHandler.getCookieFromResponse.call(void 0, res)
	let botInfoStringify

	if (simulateBot) {
		botInfoStringify = JSON.stringify({
			isBot: true,
			name: 'puppeteer-ssr',
		})
	} else {
		botInfoStringify = JSON.stringify(
			_optionalChain([cookies, 'optionalAccess', (_) => _['BotInfo']])
		)
	}

	const deviceInfo = _nullishCoalesce(
		_optionalChain([cookies, 'optionalAccess', (_2) => _2['DeviceInfo']]),
		() => ({})
	)
	const deviceType =
		_serverconfig2.default.crawl.content === 'all' ||
		_serverconfig2.default.crawl.content.includes(deviceInfo.type)
			? deviceInfo.type
			: _serverconfig2.default.crawl.content[0]

	const deviceInfoStringify = JSON.stringify({
		..._nullishCoalesce(
			_optionalChain([cookies, 'optionalAccess', (_3) => _3['DeviceInfo']]),
			() => ({})
		),
		isMobile: deviceInfo.isMobile && deviceType !== 'desktop' ? true : false,
		type: deviceType,
	})
	const localeInfoStringify = JSON.stringify(
		_optionalChain([cookies, 'optionalAccess', (_4) => _4['LocaleInfo']])
	)
	const environmentInfoStringify = JSON.stringify(
		_optionalChain([cookies, 'optionalAccess', (_5) => _5['EnvironmentInfo']])
	)

	let urlFormatted = `${url}${
		url.indexOf('?') === -1 ? '?' : '&'
	}botInfo=${botInfoStringify}&deviceInfo=${deviceInfoStringify}&localeInfo=${localeInfoStringify}&environmentInfo=${environmentInfoStringify}`.trim()

	return urlFormatted
}
exports.convertUrlHeaderToQueryString = convertUrlHeaderToQueryString // formatUrl

const getUrl = (req) => {
	if (!req) return ''

	return (
		(_InitEnv.PROCESS_ENV.ENABLE_URL_TESTING ? req.query.urlTesting : '') ||
		(_InitEnv.PROCESS_ENV.BASE_URL
			? _InitEnv.PROCESS_ENV.BASE_URL + req.originalUrl
			: req.protocol + '://' + req.get('host') + req.originalUrl)
	).trim()
}
exports.getUrl = getUrl // getUrl

const getPathname = (req) => {
	if (!req) return ''

	const pathname = (() => {
		let tmpPathName
		if (req.headers['redirect'])
			tmpPathName = _optionalChain([
				JSON,
				'access',
				(_6) => _6.parse,
				'call',
				(_7) => _7(req.headers['redirect']),
				'optionalAccess',
				(_8) => _8.path,
			])

		return _optionalChain([
			tmpPathName || req.url,
			'optionalAccess',
			(_9) => _9.split,
			'call',
			(_10) => _10('?'),
			'optionalAccess',
			(_11) => _11[0],
		])
	})()

	return pathname
}
exports.getPathname = getPathname // getPathname
