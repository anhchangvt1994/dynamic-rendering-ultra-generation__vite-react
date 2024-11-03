'use strict'
Object.defineProperty(exports, '__esModule', { value: true })

var _redirectconfig = require('../app/redirect.config')
var _InitEnv = require('./InitEnv')

const RedirectHandler = (req, res, next) => {
	const botInfoStringify = res.getHeader('Bot-Info')
	const botInfo = JSON.parse(botInfoStringify)

	if (botInfo.isBot && req.headers.service !== 'puppeteer') {
		let statusCode = 200
		let redirectUrl = ''

		const REDIRECT_INFO_FORMATTED = (() => {
			if (
				!_redirectconfig.REDIRECT_INFO ||
				!_redirectconfig.REDIRECT_INFO.length
			)
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
			if (redirectInfoItem.pathRegex.test(req.url)) {
				statusCode = redirectInfoItem.statusCode
				redirectUrl = req.url.replace(
					redirectInfoItem.path,
					redirectInfoItem.targetPath
				)
				break
			}
		}

		if (statusCode !== 200) return res.redirect(statusCode, redirectUrl)

		const urlChecked = (() => {
			if (_InitEnv.PROCESS_ENV.ENABLE_URL_TESTING && req.query.urlTesting)
				return req.originalUrl
			let tmpUrl = req.originalUrl

			if (tmpUrl.includes('?')) tmpUrl = req.originalUrl.split('?')[0]

			if (tmpUrl.length > 1 && tmpUrl[tmpUrl.length - 1] === '/')
				tmpUrl = tmpUrl.slice(0, -1)

			return tmpUrl
		})()

		if (urlChecked !== req.originalUrl) return res.redirect(301, urlChecked)
		else next()
	} else {
		next()
	}
}

exports.default = RedirectHandler
