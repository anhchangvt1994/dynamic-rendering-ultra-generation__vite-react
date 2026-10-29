const detectStaticExtension = (req: Request) => {
	const url = req.url

	if (!url) {
		return false
	}

	let isStatic = false
	isStatic =
		/[A-Za-z0-9-]+\.(vue|ts|js|css|gif|jpg|jpeg|png|ico|bmp|ogg|webp|mp4|webm|mp3|ttf|woff2?|json|rss|atom|gz|zip|rar|7z|css|js|gzip|exe|svg|pdf|docx)(\?[^\/]*)?$/.test(
			url
		)

	if (!isStatic) {
		isStatic = /^(?!.*(text\/html|application\/json))/.test(
			req.headers.get('accept') as string
		)
	}

	return isStatic
}

export default detectStaticExtension
