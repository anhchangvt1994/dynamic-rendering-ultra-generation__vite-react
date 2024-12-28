const fs = require('fs')
const { resolve } = require('path')

const browserCachePath = (() => {
	let path = ''
	if (
		process.env.PUPPETEER_CACHE_DIR &&
		fs.existsSync(process.env.PUPPETEER_CACHE_DIR)
	)
		path = process.env.PUPPETEER_CACHE_DIR
	else {
		path = resolve(__dirname, './node_modules/.puppeteer-cache')
		if (!fs.existsSync(path)) {
			try {
				fs.mkdirSync(path)
			} catch (err) {
				console.error(err)
			}
		}
	}

	return path
})()

/**
 * @type {import("puppeteer").Configuration}
 */

module.exports = {
	// Changes the cache location for Puppeteer.
	cacheDirectory: browserCachePath,
}
