"use strict"; function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var _puppeteer = require('puppeteer'); var _puppeteer2 = _interopRequireDefault(_puppeteer);
var _workerpool = require('workerpool'); var _workerpool2 = _interopRequireDefault(_workerpool);

var _path = require('path');
var _constants3 = require('../../constants');

const _deleteUserDataDir = async (path) => {
	if (path) {
		try {
			await _optionalChain([_workerpool2.default, 'access', _ => _.pool, 'call', _2 => _2(
				_path.resolve.call(void 0, 
					__dirname,
					`../utils/FollowResource.worker/index.${_constants3.resourceExtension}`
				)
			), 'optionalAccess', _3 => _3.exec, 'call', _4 => _4('deleteResource', [path])])
		} catch (err) {
			console.error(err)
		}
	}
} // _deleteUserDataDir

const loadCapacityTest = async (url) => {
	const userDataDir = `server/dist/puppeteer-ssr/test/browsers/user_data_${Date.now()}`
	const browser = await _puppeteer2.default.launch({
		// ...defaultBrowserOptions,
		headless: 'new',
		userDataDir,
		args: [
			'--no-sandbox',
			'--disable-setuid-sandbox',
			'--headless',
			// '--disable-gpu',
			'--disable-software-rasterizer',
			'--hide-scrollbars',
			'--disable-translate',
			'--disable-extensions',
			'--disable-web-security',
			'--no-first-run',
			'--disable-notifications',
			// '--chrome-flags',
			'--ignore-certificate-errors',
			'--ignore-certificate-errors-spki-list ',
			'--disable-features=IsolateOrigins,SameSiteByDefaultCookies,CookiesWithoutSameSiteMustBeSecure',
			'--no-zygote',
			'--disable-accelerated-2d-canvas',
			'--disable-speech-api', // 	Disables the Web Speech API (both speech recognition and synthesis)
			'--disable-background-networking', // Disable several subsystems which run network requests in the background. This is for use 									  // when doing network performance testing to avoid noise in the measurements. ↪
			'--disable-background-timer-throttling', // Disable task throttling of timer tasks from background pages. ↪
			'--disable-backgrounding-occluded-windows',
			'--disable-breakpad',
			'--disable-client-side-phishing-detection',
			'--disable-component-update',
			'--disable-default-apps',
			'--disable-dev-shm-usage',
			'--disable-domain-reliability',
			'--disable-features=AudioServiceOutOfProcess',
			'--disable-hang-monitor',
			'--disable-ipc-flooding-protection',
			'--disable-offer-store-unmasked-wallet-cards',
			'--disable-popup-blocking',
			'--disable-print-preview',
			'--disable-prompt-on-repost',
			'--disable-renderer-backgrounding',
			'--disable-sync',
			'--ignore-gpu-blacklist',
			'--metrics-recording-only',
			'--mute-audio',
			'--no-default-browser-check',
			'--no-pings',
			'--password-store=basic',
			'--use-gl=swiftshader',
			'--use-mock-keychain',
			// '--use-gl=angle',
			// '--use-angle=gl-egl',
			'--user-agent=Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
			// "--headless",
		],
	})

	if (browser.isConnected()) {
		const page = await browser.newPage()
		console.log('start to crawl: ', url)
		const response = await page.goto(url)
		console.log('-------------')
		if (_optionalChain([response, 'optionalAccess', _5 => _5.status, 'call', _6 => _6()]) === 200) {
			console.log('\x1b[32m', 'Success!')
			console.log('url :', url)
		} else {
			console.log('\x1b[31m', 'Fail!')
			console.log('url :', url)
		}
		console.log('-------------')
		await browser.close()
		_deleteUserDataDir(userDataDir)
	}
}

_workerpool2.default.worker({
	loadCapacityTest,
})
