/** NOTE: Just call this file in preinstall script hook of package.json */
const fs = require('fs')
const { resolve } = require('path')

const puppeteerConfigPath = resolve(__dirname, '../.puppeteerrc.js')
const targetPath = resolve(__dirname, '../../../../.puppeteerrc.js')

if (
	!['true', 'TRUE', '1'].includes(process.env.USE_CHROME_AWS_LAMBDA || '') &&
	(!process.env.PUPPETEER_CACHE_DIR ||
		!fs.existsSync(process.env.PUPPETEER_CACHE_DIR.replace('.cache', '')))
) {
	// NOTE - Copy .puppeteer.json to root workspace of this project for installing puppeteer
	fs.copyFile(puppeteerConfigPath, targetPath, (err) => {
		if (err) {
			console.error(err)
		}

		// console.log(`File ${puppeteerConfigPath} was copied to ${targetPath}`)
	})
}
