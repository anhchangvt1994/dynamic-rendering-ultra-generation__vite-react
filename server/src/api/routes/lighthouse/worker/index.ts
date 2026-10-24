import path from 'path'
import { resourceExtension } from '../../../../constants'
import BrowserManager from '../../../../puppeteer-ssr/utils/BrowserManager'
import Console from '../../../../utils/ConsoleHandler'
import WorkerManager from '../../../../utils/WorkerManager'
const { parentPort, isMainThread } = require('worker_threads')

const workerManager = WorkerManager.init(
	path.resolve(__dirname, `./worker.${resourceExtension}`),
	{
		minWorkers: 1,
		maxWorkers: 5,
		enableGlobalCounter: !isMainThread,
	},
	['runPageSpeed', 'getPageSpeedUrl']
)

// NOTE - Pagespeed needs a full browser, keep chromium for it
const browserManager = BrowserManager({ engine: 'chromium' })

export const runPageSpeed = async (url: string) => {
	if (!browserManager || !url) return

	const browser = await browserManager.get()

	if (!browser || !browser.connected) return

	const wsEndpoint = browser.wsEndpoint()

	if (!wsEndpoint) return

	const freePool = await workerManager.getFreePool({
		delay: 1000,
	})

	const pool = freePool.pool
	let result

	try {
		result = await pool.exec('runPageSpeed', [url, wsEndpoint])
	} catch (err) {
		Console.error(err)
	}

	freePool.terminate({
		force: true,
	})

	browser.emit('closePage', url)
	if (!isMainThread) {
		parentPort.postMessage({
			name: 'closePage',
			wsEndpoint,
			url,
		})
	}

	return result
} // runPageSpeed

export const getPageSpeedUrl = async (url: string) => {
	if (!browserManager || !url) return

	const browser = await browserManager.get()

	if (!browser || !browser.connected) return

	const wsEndpoint = browser.wsEndpoint()

	if (!wsEndpoint) return

	const freePool = await workerManager.getFreePool({
		delay: 500,
	})

	const pool = freePool.pool
	let result

	try {
		result = await pool.exec('getPageSpeedUrl', [url, wsEndpoint])
	} catch (err) {
		Console.error(err)
	}

	freePool.terminate({
		force: true,
	})

	browser.emit('closePage', result?.pageSpeedUrl ?? url)
	if (!isMainThread) {
		parentPort.postMessage({
			name: 'closePage',
			wsEndpoint,
			url,
		})
	}

	return result
} // getPageSpeedUrl
