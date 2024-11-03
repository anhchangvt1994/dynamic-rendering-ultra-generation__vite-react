'use strict'
Object.defineProperty(exports, '__esModule', { value: true })

var _redirectconfig = require('../app/redirect.config')
var _InitEnv = require('./InitEnv')

const DetectRedirect = (req, res) => {
	const urlInfo = new URL(`${_InitEnv.PROCESS_ENV.BASE_URL}${req.originalUrl}`)
	const redirectResult = {
		originPath: urlInfo.pathname,
		path: urlInfo.pathname,
		search: urlInfo.search
			.replace(/key=([^&]*)/, '')
			.replace(/&{2,}/, '&')
			.replace(/(\?|\?\&{0,})$/, ''),
		status: 200,
	}

	const headers = req.headers

	if (
		['puppeteer', 'web-scraping-service', 'cleaner-service'].includes(
			headers['service']
		)
	)
		return redirectResult

	const REDIRECT_INFO_FORMATTED = (() => {
		if (!_redirectconfig.REDIRECT_INFO || !_redirectconfig.REDIRECT_INFO.length)
			return []

		const tmpRedirectInfoFormatted = []

		for (const redirectInfoItem of _redirectconfig.REDIRECT_INFO) {
			tmpRedirectInfoFormatted.push({
				...redirectInfoItem,
				pathRegex: new RegExp(`${redirectInfoItem.path}(/|$)`),
			})
		}

		return tmpRedirectInfoFormatted
	})()

	for (const redirectInfoItem of REDIRECT_INFO_FORMATTED) {
		if (redirectInfoItem.pathRegex.test(urlInfo.pathname)) {
			redirectResult.status = redirectInfoItem.statusCode
			redirectResult.path = redirectInfoItem.targetPath
			break
		}
	}

	redirectResult.path = (() => {
		const query = urlInfo.searchParams

		if (_InitEnv.PROCESS_ENV.ENABLE_URL_TESTING && query.get('urlTesting'))
			return redirectResult.path

		const redirectPath = /\/$/.test(redirectResult.path)
			? redirectResult.path.slice(0, -1)
			: redirectResult.path

		return redirectPath
	})()

	if (redirectResult.path && redirectResult.path !== redirectResult.originPath)
		redirectResult.status = 301

	const redirectInjectionResult = _redirectconfig.REDIRECT_INJECTION.call(
		void 0,
		redirectResult,
		req,
		res
	)

	if (redirectInjectionResult.status !== 200) {
		redirectResult.status =
			redirectResult.status === 301
				? redirectResult.status
				: redirectInjectionResult.status
		redirectResult.path = redirectInjectionResult.path
	}

	return redirectResult
}

exports.default = DetectRedirect
