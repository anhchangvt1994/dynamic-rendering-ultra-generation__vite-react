"use strict";Object.defineProperty(exports, "__esModule", {value: true});var _geoiplite = require('geoip-lite');













const IP_INFO_DEFAULT = {
	range: [1984292864, 1984294911],
	country: 'VN',
	region: '',
	eu: '0',
	timezone: 'Asia/Ho_Chi_Minh',
	city: '',
	ll: [16, 106],
	metro: 0,
	area: 50,
}

 function generateIPInfo(req) {
	if (!req || !req.headers || !req.connection) return IP_INFO_DEFAULT

	const clientIp = (
		req.headers['x-forwarded-for'] ||
		req.connection.remoteAddress ||
		''
	)
		.toString()
		.replace(/::ffff:|::1/, '')

	const ipInfo = _geoiplite.lookup.call(void 0, clientIp) || IP_INFO_DEFAULT
	return ipInfo
} exports.default = generateIPInfo; // generateIPInfo
