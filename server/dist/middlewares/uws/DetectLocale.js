"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
var _serverconfig = require('../../server.config'); var _serverconfig2 = _interopRequireDefault(_serverconfig);
var _DetectLocaleuws = require('../../utils/DetectLocale.uws'); var _DetectLocaleuws2 = _interopRequireDefault(_DetectLocaleuws);

const DetectLocaleMiddle = (res, req) => {
	if (!res.cookies) res.cookies = {}

	res.cookies.localeInfo = (() => {
		const tmpLocaleInfo =
			req.getHeader('localeinfo') || req.getHeader('localeInfo')

		if (tmpLocaleInfo) return JSON.parse(tmpLocaleInfo)
		return _DetectLocaleuws2.default.call(void 0, req)
	})()

	const enableLocale =
		_serverconfig2.default.locale.enable &&
		Boolean(
			!_serverconfig2.default.locale.routes ||
				!_serverconfig2.default.locale.routes[req.getUrl() ] ||
				_serverconfig2.default.locale.routes[req.getUrl() ].enable
		)

	if (enableLocale) {
		res.cookies.lang =
			_nullishCoalesce(_optionalChain([res, 'access', _ => _.cookies, 'access', _2 => _2.localeInfo, 'optionalAccess', _3 => _3.langSelected]), () => ( _serverconfig2.default.locale.defaultLang))

		if (_serverconfig2.default.locale.defaultCountry) {
			res.cookies.country =
				_nullishCoalesce(_optionalChain([res, 'access', _4 => _4.cookies, 'access', _5 => _5.localeInfo, 'optionalAccess', _6 => _6.countrySelected]), () => (
				_serverconfig2.default.locale.defaultCountry))
		}
	}
}

exports. default = DetectLocaleMiddle
