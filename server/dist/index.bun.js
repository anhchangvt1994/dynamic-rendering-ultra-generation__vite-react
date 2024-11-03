'use strict'
function _interopRequireDefault(obj) {
	return obj && obj.__esModule ? obj : { default: obj }
}
function _optionalChain(ops) {
	let lastAccessLHS = undefined
	let value = ops[0]
	let i = 1
	while (i < ops.length) {
		const op = ops[i]
		const fn = ops[i + 1]
		i += 2
		if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) {
			return undefined
		}
		if (op === 'access' || op === 'optionalAccess') {
			lastAccessLHS = value
			value = fn(value)
		} else if (op === 'call' || op === 'optionalCall') {
			value = fn((...args) => value.call(lastAccessLHS, ...args))
			lastAccessLHS = undefined
		}
	}
	return value
}
var _cors = require('@elysiajs/cors')
var _child_process = require('child_process')
var _chokidar = require('chokidar')
var _chokidar2 = _interopRequireDefault(_chokidar)
var _elysia = require('elysia')
var _path = require('path')
var _path2 = _interopRequireDefault(_path)
var _PortHandler = require('../../config/utils/PortHandler')
var _constants = require('./constants')
var _indexbun = require('./puppeteer-ssr/index.bun')
var _indexbun2 = _interopRequireDefault(_indexbun)
var _ConsoleHandler = require('./utils/ConsoleHandler')
var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler)
var _DetectBotbun = require('./utils/DetectBot.bun')
var _DetectBotbun2 = _interopRequireDefault(_DetectBotbun)
var _DetectDevicebun = require('./utils/DetectDevice.bun')
var _DetectDevicebun2 = _interopRequireDefault(_DetectDevicebun)
var _DetectRedirectbun = require('./utils/DetectRedirect.bun')
var _DetectRedirectbun2 = _interopRequireDefault(_DetectRedirectbun)
var _DetectStaticExtensionbun = require('./utils/DetectStaticExtension.bun')
var _DetectStaticExtensionbun2 = _interopRequireDefault(
	_DetectStaticExtensionbun
)
var _InitEnv = require('./utils/InitEnv')
var _PathHandler = require('./utils/PathHandler')

require('events').EventEmitter.setMaxListeners(200)

const pagesPath = _PathHandler.getPagesPath.call(void 0)

const cleanResourceWithCondition = async () => {
	if (_InitEnv.ENV_MODE === 'development') {
		// NOTE - Clean Browsers and Pages after start / restart
		const {
			deleteResource,
		} = require(`./puppeteer-ssr/utils/FollowResource.worker/utils.${_constants.resourceExtension}`)
		const browsersPath = _path2.default.resolve(
			__dirname,
			'./puppeteer-ssr/browsers'
		)

		return Promise.all([
			deleteResource(browsersPath),
			deleteResource(pagesPath),
		])
	}
}

const startServer = async () => {
	await cleanResourceWithCondition()
	let port = _PortHandler.getPort.call(void 0, 'PUPPETEER_SSR_PORT')
	port = await _PortHandler.findFreePort.call(
		void 0,
		port || _InitEnv.PROCESS_ENV.PUPPETEER_SSR_PORT || 8080
	)
	_PortHandler.setPort.call(void 0, port, 'PUPPETEER_SSR_PORT')

	const app = new (0, _elysia.Elysia)()
	// const server = require('http').createServer(app)

	app
		.use(_cors.cors.call(void 0))
		.use(
			app.get('/robots.txt', () =>
				Bun.file(_path2.default.resolve(__dirname, '../robots.txt'))
			)
		)
		.use(
			app.onBeforeHandle((ctx) => {
				const isStatic = _DetectStaticExtensionbun2.default.call(
					void 0,
					ctx.request
				)
				/**
				 * NOTE
				 * Cache-Control max-age is 3 months
				 * calc by using:
				 * https://www.inchcalculator.com/convert/month-to-second/
				 */
				if (isStatic) {
					if (_InitEnv.ENV !== 'development') {
						ctx.set.headers['Cache-Control'] = 'public, max-age=7889238'
					}

					try {
						ctx.set.status = 200
						return Bun.file(
							_path2.default.resolve(__dirname, `../../dist/${ctx.path}`)
						)
					} catch (err) {
						ctx.set.status = 404
						return 'File not found'
					}
				}
			})
		)
		.use(
			app.onBeforeHandle((ctx) => {
				if (!_InitEnv.PROCESS_ENV.BASE_URL) {
					const url = new URL(ctx.request.url)
					_InitEnv.PROCESS_ENV.BASE_URL = `${url.protocol}//${url.host}`
				}
			})
		)
		.use(
			app.onBeforeHandle((ctx) => {
				const req = ctx.request
				let botInfo
				if (req.headers.get('service') === 'puppeteer') {
					botInfo = req.headers.get('bot_info') || ''
				} else {
					botInfo = JSON.stringify(_DetectBotbun2.default.call(void 0, req))
				}

				ctx.store['Bot-Info'] = botInfo
			})
		)
		.use(
			app.onBeforeHandle((ctx) => {
				const botInfo = ctx.store['Bot-Info']
					? JSON.parse(ctx.store['Bot-Info'])
					: {}
				const redirectInfo = _DetectRedirectbun2.default.call(
					void 0,
					ctx.request,
					botInfo
				)

				if (redirectInfo.statusCode !== 200)
					ctx.set.redirect = redirectInfo.redirectUrl
				else {
					const url = new URL(ctx.request.url)
					ctx.store['url'] = url
					ctx.set.headers = {
						connection: 'keep-alive',
						'keep-alive': 'timeout: 20',
					}
				}
			})
		)
		.use(
			app.onBeforeHandle((ctx) => {
				const req = ctx.request
				let deviceInfo
				if (req.headers.get('service') === 'puppeteer') {
					deviceInfo = req.headers.get('device_info') || ''
				} else {
					deviceInfo = JSON.stringify(
						_DetectDevicebun2.default.call(void 0, req)
					)
				}

				ctx.store['Device-Info'] = deviceInfo
			})
		)
	;(await _indexbun2.default).init(app)

	app.listen(port, () => {
		_ConsoleHandler2.default.log('Server started. Press Ctrl+C to quit')
		_optionalChain([
			process,
			'access',
			(_) => _.send,
			'optionalCall',
			(_2) => _2('ready'),
		])
	})

	process.on('SIGINT', async function () {
		await app.stop()
		process.exit(0)
	})

	if (_InitEnv.PROCESS_ENV.ENV === 'development') {
		// NOTE - restart server onchange
		const watcher = _chokidar2.default.watch(
			[_path2.default.resolve(__dirname, './**/*.ts')],
			{
				ignored: /$^/,
				persistent: true,
			}
		)

		watcher.on('change', async (path) => {
			_ConsoleHandler2.default.log(`File ${path} has been changed`)
			await app.stop()
			setTimeout(() => {
				_child_process.spawn.call(
					void 0,
					'node',
					['--require', 'sucrase/register', 'server/src/index.ts'],
					{
						stdio: 'inherit',
						shell: true,
					}
				)
			})
			process.exit(0)
		})
	}
}

startServer()
