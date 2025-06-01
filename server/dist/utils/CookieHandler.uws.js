"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
var _ConsoleHandler = require('./ConsoleHandler'); var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler);

 const getCookieFromRequest = (req) => {
	if (!req) {
		_ConsoleHandler2.default.error('Need provide raw request headers!')
		return
	}

	const cookie = req.getHeader('cookie')

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
