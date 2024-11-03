import { HttpRequest } from 'uWebSockets.js'

const detectStaticExtension = (req: HttpRequest) => {
	const url = req.getUrl()

	if (
		!url ||
		req.getHeader('sec-fetch-dest') === 'document' ||
		/application\/json/.test(req.getHeader('accept') as string)
	) {
		return false
	}

	const isStatic =
		(typeof req.getHeader('sec-fetch-dest') === 'string' &&
			/image|script|style/.test(req.getHeader('sec-fetch-dest'))) ||
		/[A-Za-z0-9-]+\.(vue|ts|js|css|gif|jpg|jpeg|png|ico|bmp|ogg|webp|mp4|webm|mp3|ttf|woff|json|rss|atom|gz|zip|rar|7z|css|js|gzip|exe|svg|pdf|docx|xml)(\?[^\/]*)?$/g.test(
			url
		) ||
		/\/(image|asset|video|audio|mp3|mp4|movie|font|css|js|lib|util|plugin|page|component)+(|s)+\//g.test(
			url.toLowerCase()
		)

	return isStatic
}

export default detectStaticExtension
