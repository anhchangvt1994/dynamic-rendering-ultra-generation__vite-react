'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
var _InitEnv = require('../../utils/InitEnv')

const convertUrlHeaderToQueryString = (
	url,
	[botInfoStringify, deviceInfoStringify],
	simulateBot = false
) => {
	if (!url) return ''

	if (simulateBot) {
		botInfoStringify = JSON.stringify({
			isBot: true,
			name: 'puppeteer-ssr',
		})
	}

	let urlFormatted = `${url}${
		url.indexOf('?') === -1 ? '?' : '&'
	}botInfo=${botInfoStringify}&deviceInfo=${deviceInfoStringify}`.trim()

	return urlFormatted
}
exports.convertUrlHeaderToQueryString = convertUrlHeaderToQueryString // formatUrl

const getUrl = (url) => {
	if (!url) return ''

	return (
		(_InitEnv.PROCESS_ENV.ENABLE_URL_TESTING
			? url.searchParams.urlTesting
			: '') ||
		(_InitEnv.PROCESS_ENV.BASE_URL
			? _InitEnv.PROCESS_ENV.BASE_URL + url.pathname
			: url.href)
	).trim()
}
exports.getUrl = getUrl // getUrl
