import { NextFunction, Request, Response } from 'express'
import { IBotInfo } from '../types'
import { IRedirectInfoItem, REDIRECT_INFO } from '../app/redirect.config'
import { PROCESS_ENV } from './InitEnv'

const RedirectHandler = (req: Request, res: Response, next: NextFunction) => {
	const botInfoStringify = res.getHeader('Bot-Info') as string
	const botInfo: IBotInfo = JSON.parse(botInfoStringify)

	if (botInfo.isBot && req.headers.service !== 'puppeteer') {
		let statusCode = 200
		let redirectUrl = ''

		const REDIRECT_INFO_FORMATTED = (() => {
			if (!REDIRECT_INFO || !REDIRECT_INFO.length) return []

			const tmpRedirectInfoFormatted: (IRedirectInfoItem & {
				pathRegex: RegExp
			})[] = []

			for (const redirectInfoItem of REDIRECT_INFO) {
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
			if (PROCESS_ENV.ENABLE_URL_TESTING && req.query.urlTesting)
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

export default RedirectHandler
