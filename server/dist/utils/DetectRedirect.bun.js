"use strict";Object.defineProperty(exports, "__esModule", {value: true});




var _redirectconfig = require('../app/redirect.config');

const DetectRedirect





 = (req, botInfo) => {
	let statusCode = 200
	let redirectUrl = ''

	if (!botInfo || !botInfo.isBot || req.headers.get('service') === 'puppeteer')
		return {
			statusCode,
			redirectUrl,
		}

	const REDIRECT_INFO_FORMATTED = (() => {
		if (!_redirectconfig.REDIRECT_INFO || !_redirectconfig.REDIRECT_INFO.length) return []

		const tmpRedirectInfoFormatted

 = []

		for (const redirectInfoItem of _redirectconfig.REDIRECT_INFO) {
			tmpRedirectInfoFormatted.push({
				...redirectInfoItem,
				pathRegex: new RegExp(`${redirectInfoItem.path}(/|$)`),
			})
		}

		return tmpRedirectInfoFormatted
	})()

	const url = new URL(req.url)

	for (const redirectInfoItem of REDIRECT_INFO_FORMATTED) {
		if (redirectInfoItem.pathRegex.test(req.url)) {
			statusCode = redirectInfoItem.statusCode
			redirectUrl = req.url
				.replace(redirectInfoItem.path, redirectInfoItem.targetPath)
				.replace(url.origin, '')
			break
		}
	}

	if (statusCode !== 200)
		return {
			statusCode,
			redirectUrl,
		}

	redirectUrl = (() => {
		const query = url.searchParams 

		if (query.urlTesting) return url.href
		let tmpUrl = url.href

		if (tmpUrl.includes('?')) tmpUrl = url.href.split('?')[0]

		if (url.pathname.length > 1 && tmpUrl[tmpUrl.length - 1] === '/')
			tmpUrl = tmpUrl.slice(0, -1)

		return tmpUrl
	})()

	if (redirectUrl !== url.href)
		return {
			statusCode: 301,
			redirectUrl: redirectUrl.replace(url.origin, ''),
		}
	else return _redirectconfig.REDIRECT_INJECTION.call(void 0, url)
}

exports. default = DetectRedirect
