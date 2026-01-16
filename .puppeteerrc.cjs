const fs = require('fs')
const { resolve } = require('path')
const path = require('path')

const serverInfo = (() => {
	try {
		const tmpServerInfo = fs.readFileSync(
			path.resolve(__dirname, './server/server-info.json')
		)

		return JSON.parse(tmpServerInfo)
	} catch (err) {
		console.log(err)
		return {}
	}
})()

const canUseLinuxChromium = serverInfo.platform?.toLowerCase?.() === 'linux'

const browserCachePath = (() => {
	let path = ''
	if (
		process.env.PUPPETEER_CACHE_DIR &&
		fs.existsSync(process.env.PUPPETEER_CACHE_DIR)
	)
		path = process.env.PUPPETEER_CACHE_DIR
	else {
		path = resolve(__dirname, './node_modules/.puppeteer-cache')
		if (!fs.existsSync(path)) fs.mkdirSync(path)
	}

	return path
})()

/**
 * @type {import("puppeteer").Configuration}
 */

module.exports = {
	// Changes the cache location for Puppeteer.
	cacheDirectory: browserCachePath,
	skipDownload: canUseLinuxChromium,
}
