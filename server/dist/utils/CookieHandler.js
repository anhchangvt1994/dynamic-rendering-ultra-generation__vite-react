"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var _ConsoleHandler = require('./ConsoleHandler'); var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler);

 const getCookieFromRequest = (req) => {
	if (!req) {
		_ConsoleHandler2.default.error('Need provide raw request headers!')
		return
	}

	const headers = req.headers
	const cookie = headers.cookie

	if (!cookie) return {}

	const cookieSplitted = cookie.split(';')
	const cookies = {}

	for (const cookieItem of cookieSplitted) {
		if (!cookieItem) continue
		const equalIndex = cookieItem.indexOf('=')
		if (equalIndex === -1) continue

		const key = _optionalChain([cookieItem, 'access', _ => _.slice, 'call', _2 => _2(0, equalIndex), 'optionalAccess', _3 => _3.trim, 'call', _4 => _4()])
		if (!key) continue

		const value = cookieItem.slice(equalIndex + 1, cookieItem.length)

		cookies[key] = (() => {
			if (/^{(.|[\r\n])*?}$/.test(value)) return JSON.parse(value)
			return value || ''
		})()
	}

	return cookies
}; exports.getCookieFromRequest = getCookieFromRequest // getCookieFromRequest

 const getCookieFromResponse = (res) => {
	if (!res) {
		_ConsoleHandler2.default.error('Need provide raw response headers!')
		return
	}

	const headers = _nullishCoalesce(_nullishCoalesce(_optionalChain([res, 'optionalAccess', _5 => _5.raws, 'optionalAccess', _6 => _6.headers]), () => ( _optionalChain([res, 'optionalAccess', _7 => _7.getHeaders, 'optionalCall', _8 => _8()]))), () => ( {}))
	const cookies = headers['set-cookie'] || []
	const result = {}

	for (const cookie of cookies) {
		if (cookie && cookie.includes('=')) {
			const cookieSplitted = cookie.split('=')
			result[cookieSplitted[0]] = (() => {
				const value = cookieSplitted[1].split(';')[0]
				if (/^{(.|[\r\n])*?}$/.test(value)) return JSON.parse(value)
				return value
			})()
		}
	}

	return result
}; exports.getCookieFromResponse = getCookieFromResponse // getCookie

 const setCookie = (res, value) => {
	if (!res) {
		_ConsoleHandler2.default.error('Need provide raw response headers!')
		return
	} else if (!value) {
		_ConsoleHandler2.default.error('Need provide raw response value!')
	}

	const headers = _nullishCoalesce(_nullishCoalesce(_optionalChain([res, 'optionalAccess', _9 => _9.raws, 'optionalAccess', _10 => _10.headers]), () => ( _optionalChain([res, 'optionalAccess', _11 => _11.getHeaders, 'optionalCall', _12 => _12()]))), () => ( {}))

	const arrValue = typeof value === 'object' ? value : [value]
	const cookies = (headers['set-cookie'] || []).concat(arrValue)

	if (cookies.length) {
		if (res.setHeader) res.setHeader('Set-Cookie', cookies)
		else res.raw.setHeader('Set-Cookie', cookies)
	}
}; exports.setCookie = setCookie // setCookie
