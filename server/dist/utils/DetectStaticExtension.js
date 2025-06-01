"use strict";Object.defineProperty(exports, "__esModule", {value: true});

const detectStaticExtension = (req) => {
	const url = req.url

	if (
		!url ||
		req.headers['sec-fetch-dest'] === 'document' ||
		/application\/json/.test(req.headers['accept'] )
	) {
		return false
	}

	const isStatic =
		(typeof req.headers['sec-fetch-dest'] === 'string' &&
			/image|script|style/.test(req.headers['sec-fetch-dest'])) ||
		/[A-Za-z0-9-]+\.(vue|ts|js|css|gif|jpg|jpeg|png|ico|bmp|ogg|webp|mp4|webm|mp3|ttf|woff|json|rss|atom|gz|zip|rar|7z|css|js|gzip|exe|svg|pdf|docx)(\?[^\/]*)?$/g.test(
			url
		) ||
		/\/(image|asset|video|audio|mp3|mp4|movie|font|css|js|lib|util|plugin|page|component)+(|s)+\//g.test(
			url
		)

	return isStatic
}

exports. default = detectStaticExtension
