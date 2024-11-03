import { HttpRequest, HttpResponse } from 'uWebSockets.js'
import { COOKIE_EXPIRED } from '../../constants'
import ServerConfig from '../../server.config'
import DetectRedirect from '../../utils/DetectRedirect.uws'

const COOKIE_EXPIRED_SECOND = COOKIE_EXPIRED / 1000

const DetectRedirectMiddle = (res: HttpResponse, req: HttpRequest): Boolean => {
	res.urlForCrawler = req.getUrl()

	if (ServerConfig.isRemoteCrawler) return false
	const redirectResult = DetectRedirect(req, res)
	const isRedirect = redirectResult.status !== 200

	if (isRedirect) {
		if (req.getHeader('accept') === 'application/json') {
			res.urlForCrawler = redirectResult.path
			res
				.writeHeader(
					'set-cookie',
					`LocaleInfo=${JSON.stringify(
						res.cookies.localeInfo
					)};Max-Age=${COOKIE_EXPIRED_SECOND};Path=/`
				)
				.writeHeader('Cache-Control', 'no-store')
				.end(JSON.stringify(redirectResult), true)
		} else {
			if (redirectResult.path.length > 1)
				redirectResult.path = redirectResult.path.replace(/\/$|\/(\?)/, '$1')
			res
				.writeStatus(String(redirectResult.status))
				.writeHeader(
					'Location',
					`${redirectResult.path || '/'}${
						redirectResult.search ? redirectResult.search : ''
					}`
				)
				.writeHeader('cache-control', 'no-store')
				.end('', true)
		}

		res.writableEnded = true
	}

	return isRedirect
}

export default DetectRedirectMiddle
