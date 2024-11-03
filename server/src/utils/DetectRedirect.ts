import {
	IRedirectInfoItem,
	IRedirectResult,
	REDIRECT_INFO,
	REDIRECT_INJECTION,
} from '../app/redirect.config'
import { PROCESS_ENV } from './InitEnv'

const DetectRedirect: (req, res) => IRedirectResult = (req, res) => {
	const urlInfo = new URL(`${PROCESS_ENV.BASE_URL}${req.originalUrl}`)
	const redirectResult: IRedirectResult = {
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
		if (redirectInfoItem.pathRegex.test(urlInfo.pathname)) {
			redirectResult.status = redirectInfoItem.statusCode
			redirectResult.path = redirectInfoItem.targetPath
			break
		}
	}

	redirectResult.path = (() => {
		const query = urlInfo.searchParams

		if (PROCESS_ENV.ENABLE_URL_TESTING && query.get('urlTesting'))
			return redirectResult.path

		const redirectPath = /\/$/.test(redirectResult.path)
			? redirectResult.path.slice(0, -1)
			: redirectResult.path

		return redirectPath
	})()

	if (redirectResult.path && redirectResult.path !== redirectResult.originPath)
		redirectResult.status = 301

	const redirectInjectionResult = REDIRECT_INJECTION(redirectResult, req, res)

	if (redirectInjectionResult.status !== 200) {
		redirectResult.status =
			redirectResult.status === 301
				? redirectResult.status
				: redirectInjectionResult.status
		redirectResult.path = redirectInjectionResult.path
	}

	return redirectResult
}

export default DetectRedirect
