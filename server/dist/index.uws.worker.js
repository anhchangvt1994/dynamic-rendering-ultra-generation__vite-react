"use strict"; function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } } function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var _fs = require('fs'); var _fs2 = _interopRequireDefault(_fs);
var _path = require('path'); var _path2 = _interopRequireDefault(_path);





var _PortHandler = require('./../../config/utils/PortHandler');
var _BrowserManager = require('./puppeteer-ssr/utils/BrowserManager'); var _BrowserManager2 = _interopRequireDefault(_BrowserManager);
var _serverconfig = require('./server.config'); var _serverconfig2 = _interopRequireDefault(_serverconfig);
var _ConsoleHandler = require('./utils/ConsoleHandler'); var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler);
var _InitEnv = require('./utils/InitEnv');

const {
	Worker,
	isMainThread,
	parentPort,
	workerData,
} = require('worker_threads')
require('events').EventEmitter.setMaxListeners(200)

const startServer = async () => {
	if (isMainThread) {
		let port =
			_InitEnv.PROCESS_ENV.PORT || _InitEnv.ENV_MODE === 'production'
				? _InitEnv.PROCESS_ENV.PORT || 8080
				: _PortHandler.getPort.call(void 0, 'PUPPETEER_SSR_PORT')

		if (!port) {
			port = await _PortHandler.findFreePort.call(void 0, port || _InitEnv.PROCESS_ENV.PUPPETEER_SSR_PORT || 8080)
			_PortHandler.setPort.call(void 0, port, 'PUPPETEER_SSR_PORT')
		}

		_InitEnv.PROCESS_ENV.PORT = port

		const app = require('uWebSockets.js')./*SSL*/ App({
			key_file_name: 'misc/key.pem',
			cert_file_name: 'misc/cert.pem',
		})

		app.listen(Number(port), (token) => {
			if (token) {
				console.log(`Server started port ${port}. Press Ctrl+C to quit`)
				_optionalChain([process, 'access', _ => _.send, 'optionalCall', _2 => _2('ready')])
				process.title = 'web-scraping'
			} else {
				console.log(`Failed to listen to port ${port}`)
			}
		})

		Promise.resolve().then(() => _interopRequireWildcard(require('./utils/CleanerService'))).catch((err) => {
			_ConsoleHandler2.default.error(err.message)
		})

		process.on('SIGINT', async function () {
			await app.close()
			process.exit(0)
		})

		const browserManager = _BrowserManager2.default.call(void 0, )
		const browserList = new Map()

		const _createWorkerListener = (worker) => {
			if (!worker) return

			worker.on('message', async (payload) => {
				if (!browserManager || !payload) return

				if (payload.name === 'acceptor') {
					app.addChildAppDescriptor(payload.value)
				} else if (payload.name === 'getBrowser') {
					const browser = await browserManager.get()
					if (
						browser &&
						browser.connected &&
						!browserList.has(browser.wsEndpoint())
					) {
						const wsEndpoint = browser.wsEndpoint()
						browserList.set(wsEndpoint, browser )
						browser.once('closed', () => {
							browserList.delete(wsEndpoint)
						})
					}
				} else if (payload.name === 'closePage') {
					if (payload.wsEndpoint) {
						const browser = browserList.get(payload.wsEndpoint)
						if (!browser || !browser.connected) return
						browser.emit('closePage', payload.url)
					}
				}
			})
		} // _createWorkerListener

		// Spawn two worker threads
		const worker1 = new Worker(__filename, {
			workerData: { order: 1, port: 4040 },
		})
		_createWorkerListener(worker1)
		const worker2 = new Worker(__filename, {
			workerData: { order: 2, port: 4041 },
		})
		_createWorkerListener(worker2)
		const worker3 = new Worker(__filename, {
			workerData: { order: 3, port: 4042 },
		})
		_createWorkerListener(worker3)
		const worker4 = new Worker(__filename, {
			workerData: { order: 4, port: 4043 },
		})
		_createWorkerListener(worker4)
		const worker5 = new Worker(__filename, {
			workerData: { order: 5, port: 4044 },
		})
		_createWorkerListener(worker5)
	} else {
		const setupCors = (res) => {
			res
				.writeHeader('Access-Control-Allow-Origin', '*')
				.writeHeader('Access-Control-Allow-Credentials', 'true')
				.writeHeader(
					'Access-Control-Allow-Methods',
					'GET, POST, PUT, DELETE, OPTIONS'
				)
				.writeHeader(
					'Access-Control-Allow-Headers',
					'origin, content-type, accept,' +
						' x-requested-with, authorization, lang, domain-key, Access-Control-Allow-Origin'
				)
				.writeHeader('Access-Control-Max-Age', '2592000')
				.writeHeader('Vary', 'Origin')
		}

		const port = await _PortHandler.findFreePort.call(void 0, _nullishCoalesce(_optionalChain([workerData, 'optionalAccess', _3 => _3.port]), () => ( 4040)))

		_InitEnv.PROCESS_ENV.PORT = port

		const app = require('uWebSockets.js')./*SSL*/ App({
			key_file_name: 'misc/key.pem',
			cert_file_name: 'misc/cert.pem',
		})

		app.any('/*', (res, req) => {
			setupCors(res)

			res.end('', true) // end the request
		})

		if (!_serverconfig2.default.isRemoteCrawler) {
			app.get('/robots.txt', (res, req) => {
				try {
					const body = _fs2.default.readFileSync(_path2.default.resolve(__dirname, '../robots.txt'))
					res.end(body, true)
				} catch (e) {
					res.writeStatus('404')
					res.end('File not found', true)
				}
			})
		}

		;(await require('./api/index.uws').default).init(app)
		;(await require('./puppeteer-ssr/index.uws').default).init(app)

		app.listen(Number(port), (token) => {
			if (token) {
				console.log(`Server started port ${port}. Press Ctrl+C to quit`)
				_optionalChain([process, 'access', _4 => _4.send, 'optionalCall', _5 => _5('ready')])
				process.title = 'web-scraping'
			} else {
				console.log(`Failed to listen to port ${port}`)
			}
		})

		process.on('SIGINT', async function () {
			await app.close()
			process.exit(0)
		})

		/* The worker sends back its descriptor to the main acceptor */
		parentPort.postMessage({
			name: 'acceptor',
			value: app.getDescriptor(),
		})
	}
}

startServer()
