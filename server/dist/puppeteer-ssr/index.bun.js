"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _path = require('path'); var _path2 = _interopRequireDefault(_path);
var _constants = require('../constants');

var _CleanerService = require('../utils/CleanerService'); var _CleanerService2 = _interopRequireDefault(_CleanerService);
var _ConsoleHandler = require('../utils/ConsoleHandler'); var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler);
var _constants3 = require('./constants');
var _FormatUrlbun = require('./utils/FormatUrl.bun');
var _SSRGeneratornext = require('./utils/SSRGenerator.next'); var _SSRGeneratornext2 = _interopRequireDefault(_SSRGeneratornext);
var _SSRHandler = require('./utils/SSRHandler'); var _SSRHandler2 = _interopRequireDefault(_SSRHandler);


const puppeteerSSRService = (async () => {
	let _app
	const ssrHandlerAuthorization = 'mtr-ssr-handler'
	const cleanerServiceAuthorization = 'mtr-cleaner-service'

	const _allRequestHandler = () => {
		if (_constants.SERVER_LESS) {
			_app
				.get('/web-scraping', async (ctx) => {
					const req = ctx.request
					if (req.headers['authorization'] !== ssrHandlerAuthorization) {
						ctx.set.status = 200
						return 'Welcome to MTr Web Scraping Service, please provide authorization to use it.'
					}

					const query = ctx.store['query']

					const startGenerating = Number(query.startGenerating)
					const isFirstRequest = !!query.isFirstRequest
					const url = query.url
						? (decodeURIComponent(query.url ) )
						: ''

					const result = await _SSRHandler2.default.call(void 0, {
						startGenerating,
						isFirstRequest,
						url,
					})

					ctx.set.status = 200

					return JSON.stringify(result || {})
				})
				.post('/cleaner-service', async (ctx) => {
					const req = ctx.request
					if (
						req.headers.get('authorization') !== cleanerServiceAuthorization
					) {
						ctx.set.status = 200
						return 'Welcome to MTr Cleaner Service, please provide authorization to use it.'
					} else if (!_constants.SERVER_LESS) {
						ctx.set.status = 200
						return 'MTr cleaner service can not run in none serverless environment'
					}

					await _CleanerService2.default.call(void 0, )

					_ConsoleHandler2.default.log('Finish clean service!')

					ctx.set.status = 200
					return 'Finish clean service!'
				})
		}
		_app.get('*', async ({ cookie, ...ctx }) => {
			const req = ctx.request
			const botInfoStringify = ctx.store['Bot-Info'] 
			const botInfo = JSON.parse(botInfoStringify)

			cookie['BotInfo'].set({
				value: ctx.store['Bot-Info'],
				maxAge: _constants3.COOKIE_EXPIRED,
			})
			cookie['DeviceInfo'].set({
				value: ctx.store['Device-Info'],
				maxAge: _constants3.COOKIE_EXPIRED,
			})
			const url = _FormatUrlbun.convertUrlHeaderToQueryString.call(void 0, 
				_FormatUrlbun.getUrl.call(void 0, ctx.store['url']),
				[ctx.store['Bot-Info'], ctx.store['Device-Info']],
				true
			)

			if (req.headers.get('service') !== 'puppeteer') {
				if (botInfo.isBot) {
					try {
						const result = await _SSRGeneratornext2.default.call(void 0, {
							url,
						})

						if (result) {
							/**
							 * NOTE
							 * Cache-Control max-age is 1 year
							 * calc by using:
							 * https://www.inchcalculator.com/convert/year-to-second/
							 */
							ctx.set.headers['Server-Timing'] =
								'Prerender;dur=50;desc="Headless render time (ms)"'
							ctx.set.headers['Content-Type'] = 'text/html'
							ctx.set.headers['Cache-Control'] = 'public, max-age: 31556952'

							ctx.set.status = result.status

							if (result.status === 503) ctx.set.headers['Retry-After'] = '120'
						} else {
							ctx.set.status = 504
							return '504 Gateway Timeout'
						}

						// Add Server-Timing! See https://w3c.github.io/server-timing/.
						if (_constants3.CACHEABLE_STATUS_CODE[result.status] || result.status === 503)
							return Bun.file(result.response).text()
						// Serve prerendered page as response.
						else return result.html || `${result.status} Error` // Serve prerendered page as response.
					} catch (err) {
						_ConsoleHandler2.default.error('url', url)
						_ConsoleHandler2.default.error(err)
						ctx.set.status = 504
						return '504 Gateway Timeout'
					} finally {
						return
					}
				}

				try {
					if (_constants.SERVER_LESS) {
						await _SSRGeneratornext2.default.call(void 0, {
							url,
							isSkipWaiting: true,
						})
					} else {
						_SSRGeneratornext2.default.call(void 0, {
							url,
							isSkipWaiting: true,
						})
					}
				} catch (err) {
					_ConsoleHandler2.default.error('url', url)
					_ConsoleHandler2.default.error(err)
				}
			}

			/**
			 * NOTE
			 * Cache-Control max-age is 1 year
			 * calc by using:
			 * https://www.inchcalculator.com/convert/year-to-second/
			 */
			ctx.set.headers['Content-Type'] = 'text/html'
			ctx.set.headers['Cache-Control'] = 'public, max-age: 31556952'
			ctx.set.status = 200
			return Bun.file(
				(req.headers.get('staticHtmlPath') ) ||
					_path2.default.resolve(__dirname, '../../../dist/index.html')
			)
		})
	}

	return {
		init(app) {
			if (!app) return _ConsoleHandler2.default.warn('You need provide bun app!')
			_app = app
			_allRequestHandler()
		},
	}
})()

exports. default = puppeteerSSRService
