import fs from 'fs'
import path from 'path'
import { Browser } from 'puppeteer-core'
import BrowserManager from './puppeteer-ssr/utils/BrowserManager'
import ServerConfig from './server.config'
import Console from './utils/ConsoleHandler'
import { ENV_MODE, PROCESS_ENV } from './utils/InitEnv'
import { findFreePort, getPort, setPort } from './utils/PortHandler'
import { getResourceBudget } from './utils/ResourceBudget'

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
      PROCESS_ENV.PORT || ENV_MODE === 'production'
        ? PROCESS_ENV.PORT || 8080
        : getPort('PUPPETEER_SSR_PORT')

    if (!port) {
      port = await findFreePort(
        Number(port || PROCESS_ENV.PUPPETEER_SSR_PORT || 8080)
      )
      setPort(port, 'PUPPETEER_SSR_PORT')
    }

    PROCESS_ENV.PORT = String(port)

    const app = require('uWebSockets.js')./*SSL*/ App({
      key_file_name: 'misc/key.pem',
      cert_file_name: 'misc/cert.pem',
    })

    import('./utils/CleanerService').catch((err) => {
      Console.error(err.message)
    })

    process.on('SIGINT', async function () {
      await app.close()
      process.exit(0)
    })

    const browserManager = BrowserManager()
    const browserList = new Map<string, Browser>()
    const readyWorkers = new Set<number>()

    const _createWorkerListener = (worker) => {
      if (!worker) return

      worker.on('message', async (payload) => {
        if (!payload) return

        if (payload.name === 'acceptor') {
          if (readyWorkers.has(worker.threadId)) return
          app.addChildAppDescriptor(payload.value)
          readyWorkers.add(worker.threadId)
          // The acceptor has no application routes of its own. Exposing it
          // before its HTTP workers are registered returns uWS's default 404.
          if (readyWorkers.size === budget.requestWorkers) {
            app.listen(Number(port), (token) => {
              if (!token) {
                Console.error(`Failed to listen to port ${port}`)
                process.exit(1)
              }
              clearTimeout(startupTimeout)
              console.log(`Server started port ${port}. Press Ctrl+C to quit`)
              process.title = 'web-scraping'
              process.send?.('ready')
            })
          }
        } else if (payload.name === 'getBrowser') {
          const browser = await (
            payload.engine
              ? BrowserManager({ engine: payload.engine })
              : browserManager
          )?.get()
          if (
            browser &&
            browser.connected &&
            !browserList.has(browser.wsEndpoint())
          ) {
            const wsEndpoint = browser.wsEndpoint()
            browserList.set(wsEndpoint, browser as Browser)
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

    const budget = getResourceBudget(PROCESS_ENV)
    const renderSlots = new SharedArrayBuffer(4)
    const startupTimeout = setTimeout(() => {
      Console.error(
        `HTTP startup timed out: ${readyWorkers.size}/${budget.requestWorkers} workers ready`
      )
      process.exit(1)
    }, 35000)
    console.log('[resources]', JSON.stringify(budget))
    for (let order = 1; order <= budget.requestWorkers; order++) {
      const worker = new Worker(__filename, {
        workerData: { order, port: 4040 + order - 1, renderSlots },
        execArgv: process.execArgv.filter(
          (arg) => !/^--max[-_]old[-_]space[-_]size/.test(arg)
        ),
        resourceLimits: { maxOldGenerationSizeMb: budget.workerHeapMB },
      })
      worker.on('error', (error) => {
        Console.error('HTTP worker failed:', error)
        process.exit(1)
      })
      worker.on('exit', (code) => {
        if (code !== 0) process.exit(1)
      })
      _createWorkerListener(worker)
    }
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

    const port = await findFreePort(workerData?.port ?? 4040)

    PROCESS_ENV.PORT = String(port)

    const app = require('uWebSockets.js')./*SSL*/ App({
      key_file_name: 'misc/key.pem',
      cert_file_name: 'misc/cert.pem',
    })

    app.any('/*', (res) => {
      setupCors(res)

      res.end('') // end the request
    })

    if (!ServerConfig.isRemoteCrawler) {
      app.get('/robots.txt', (res) => {
        try {
          const body = fs.readFileSync(path.resolve(__dirname, '../robots.txt'))
          res.end(body)
        } catch {
          res.writeStatus('404')
          res.end('File not found')
        }
      })
    }

    ;(await require('./og/index.uws').default).init(app) // share cards
    ;(await require('./api/index.uws').default).init(app)
    ;(await require('./puppeteer-ssr/index.uws').default).init(app)
    ;(await require('./sitemap/index.uws').default).init(app)

    app.listen(Number(port), (token) => {
      if (token) {
        console.log(`Server started port ${port}. Press Ctrl+C to quit`)
        process.title = 'web-scraping'
      } else {
        Console.error(`Failed to listen to port ${port}`)
        process.exit(1)
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
