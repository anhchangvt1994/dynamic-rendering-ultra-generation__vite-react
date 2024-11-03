import { cors } from '@elysiajs/cors'
import { spawn } from 'child_process'
import chokidar from 'chokidar'
import { Elysia } from 'elysia'
import path from 'path'
import { findFreePort, getPort, setPort } from '../../config/utils/PortHandler'
import { resourceExtension } from './constants'
import puppeteerSSRService from './puppeteer-ssr/index.bun'
import Console from './utils/ConsoleHandler'
import detectBot from './utils/DetectBot.bun'
import detectDevice from './utils/DetectDevice.bun'
import DetectRedirect from './utils/DetectRedirect.bun'
import detectStaticExtension from './utils/DetectStaticExtension.bun'
import { ENV, ENV_MODE, PROCESS_ENV } from './utils/InitEnv'
import { getPagesPath } from './utils/PathHandler'

require('events').EventEmitter.setMaxListeners(200)

const pagesPath = getPagesPath()

const cleanResourceWithCondition = async () => {
	if (ENV_MODE === 'development') {
		// NOTE - Clean Browsers and Pages after start / restart
		const {
			deleteResource,
		} = require(`./puppeteer-ssr/utils/FollowResource.worker/utils.${resourceExtension}`)
		const browsersPath = path.resolve(__dirname, './puppeteer-ssr/browsers')

		return Promise.all([
			deleteResource(browsersPath),
			deleteResource(pagesPath),
		])
	}
}

const startServer = async () => {
	await cleanResourceWithCondition()
	let port = getPort('PUPPETEER_SSR_PORT')
	port = await findFreePort(port || PROCESS_ENV.PUPPETEER_SSR_PORT || 8080)
	setPort(port, 'PUPPETEER_SSR_PORT')

	const app = new Elysia()
	// const server = require('http').createServer(app)

	app
		.use(cors())
		.use(
			app.get('/robots.txt', () =>
				Bun.file(path.resolve(__dirname, '../robots.txt'))
			)
		)
		.use(
			app.onBeforeHandle((ctx) => {
				const isStatic = detectStaticExtension(ctx.request)
				/**
				 * NOTE
				 * Cache-Control max-age is 3 months
				 * calc by using:
				 * https://www.inchcalculator.com/convert/month-to-second/
				 */
				if (isStatic) {
					if (ENV !== 'development') {
						ctx.set.headers['Cache-Control'] = 'public, max-age=7889238'
					}

					try {
						ctx.set.status = 200
						return Bun.file(path.resolve(__dirname, `../../dist/${ctx.path}`))
					} catch (err) {
						ctx.set.status = 404
						return 'File not found'
					}
				}
			})
		)
		.use(
			app.onBeforeHandle((ctx) => {
				if (!PROCESS_ENV.BASE_URL) {
					const url = new URL(ctx.request.url)
					PROCESS_ENV.BASE_URL = `${url.protocol}//${url.host}`
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
					botInfo = JSON.stringify(detectBot(req))
				}

				ctx.store['Bot-Info'] = botInfo
			})
		)
		.use(
			app.onBeforeHandle((ctx) => {
				const botInfo = ctx.store['Bot-Info']
					? JSON.parse(ctx.store['Bot-Info'])
					: {}
				const redirectInfo = DetectRedirect(ctx.request, botInfo)

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
					deviceInfo = JSON.stringify(detectDevice(req))
				}

				ctx.store['Device-Info'] = deviceInfo
			})
		)
	;(await puppeteerSSRService).init(app)

	app.listen(port, () => {
		Console.log('Server started. Press Ctrl+C to quit')
		process.send?.('ready')
	})

	process.on('SIGINT', async function () {
		await app.stop()
		process.exit(0)
	})

	if (PROCESS_ENV.ENV === 'development') {
		// NOTE - restart server onchange
		const watcher = chokidar.watch([path.resolve(__dirname, './**/*.ts')], {
			ignored: /$^/,
			persistent: true,
		})

		watcher.on('change', async (path) => {
			Console.log(`File ${path} has been changed`)
			await app.stop()
			setTimeout(() => {
				spawn(
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
