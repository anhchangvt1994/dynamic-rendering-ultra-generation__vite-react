import Chromium from '@sparticuz/chromium-min'
import chokidar from 'chokidar'
import path from 'path'
import { resourceExtension, SERVER_LESS } from '../../constants'
import {
	canUseLinuxChromium,
	chromiumPath,
} from '../../puppeteer-ssr/constants'
import { getStore, setStore } from '../../store'
import Console from '../ConsoleHandler'
import { PROCESS_ENV } from '../InitEnv'
import {
	getDataPath,
	getPagesPath,
	getStorePath,
	getUserDataPath,
	getViewsPath,
	getWorkerManagerPath,
} from '../PathHandler'
import WorkerManager from '../WorkerManager'
import fs from 'fs-extra'

const pagesPath = getPagesPath()
const viewsPath = getViewsPath()
const dataPath = getDataPath()
const storePath = getStorePath()
const userDataPath = getUserDataPath()
const workerManagerPath = getWorkerManagerPath()

const { isMainThread } = require('worker_threads')

const workerManager = (() => {
	if (!isMainThread) return
	return WorkerManager.init(
		path.resolve(
			__dirname,
			`../FollowResource.worker/index.${resourceExtension}`
		),
		{
			minWorkers: 1,
			maxWorkers: 5,
		},
		[
			'scanToCleanBrowsers',
			'scanToCleanPages',
			'scanToCleanViews',
			'scanToCleanAPIDataCache',
			'deleteResource',
			'copyResource',
		]
	)
})()

export const cleanBrowsers = (() => {
	let executablePath: string
	return async (
		expiredTime = PROCESS_ENV.RESET_RESOURCE
			? 0
			: process.env.MODE === 'development'
			? 0
			: 60
	) => {
		if (!isMainThread || process.env.DISABLE_INTERNAL_CRAWLER || !workerManager)
			return

		const browserStore = (() => {
			const tmpBrowserStore = getStore('browser')
			return tmpBrowserStore || {}
		})()
		const promiseStore = (() => {
			const tmpPromiseStore = getStore('promise')
			return tmpPromiseStore || {}
		})()

		if (canUseLinuxChromium && !promiseStore.executablePath) {
			Console.log('Create executablePath')
			promiseStore.executablePath = Chromium.executablePath(chromiumPath)
		}

		setStore('browser', browserStore)
		setStore('promise', promiseStore)

		if (!executablePath && promiseStore.executablePath) {
			executablePath = await promiseStore.executablePath
		}

		const freePool = await workerManager.getFreePool()
		const pool = freePool.pool

		browserStore.executablePath = executablePath

		try {
			await pool.exec('scanToCleanBrowsers', [
				userDataPath,
				expiredTime,
				browserStore,
			])
		} catch (err) {
			Console.error(err)
		}

		freePool.terminate({
			force: true,
		})

		if (!SERVER_LESS)
			setTimeout(() => {
				cleanBrowsers(5)
			}, 300000)
	}
})() // cleanBrowsers

export const cleanPages = (() => {
	return async () => {
		if (!isMainThread || !workerManager) return

		const freePool = await workerManager.getFreePool()
		const pool = freePool.pool

		try {
			await pool.exec('scanToCleanPages', [pagesPath])
		} catch (err) {
			Console.error(err)
		}

		freePool.terminate({
			force: true,
		})

		if (!SERVER_LESS) {
			setTimeout(() => {
				cleanPages()
			}, 1800000)
		}
	}
})() // cleanPages

export const cleanViews = (() => {
	// let cleanViewsTimeout: NodeJS.Timeout
	// let distFilesChangedTimeout: NodeJS.Timeout
	// let isDistChanging: boolean = false

	// ;(() => {
	// 	if (!isMainThread || !workerManager) return

	// try {
	// 	fs.emptyDirSync(path.resolve(__dirname, '../../../resources'))
	// 	fs.copySync(
	// 		path.resolve(__dirname, '../../../../dist'),
	// 		path.resolve(__dirname, '../../../resources')
	// 	)
	// } catch (err) {
	// 	Console.error(err)
	// }

	// const watcher = chokidar.watch(
	// 	[
	// 		path.resolve(__dirname, '../../../../dist/**/*'),
	// 		path.resolve(__dirname, '../../../../dist/*'),
	// 	],
	// 	{
	// 		ignored: /$^/,
	// 		persistent: true,
	// 	}
	// ) // /$^/ is match nothing

	// watcher.on('change', function () {
	// 	if (isDistChanging) return
	// 	isDistChanging = true

	// 	if (cleanViewsTimeout) {
	// 		clearTimeout(cleanViewsTimeout)
	// 	}

	// 	if (distFilesChangedTimeout) {
	// 		clearTimeout(distFilesChangedTimeout)
	// 	}

	// 	distFilesChangedTimeout = setTimeout(async () => {
	// 		const freePool = await workerManager.getFreePool()
	// 		const pool = freePool.pool

	// 		try {
	// 			await pool.exec('deleteResource', [viewsPath])
	// 		} catch (err) {
	// 			Console.error(err)
	// 		}

	// 		isDistChanging = false
	// 		cleanViewsTimeout = setTimeout(() => {
	// 			cleanViews()
	// 		}, 300000)

	// 		freePool.terminate({
	// 			force: true,
	// 		})
	// 	}, 1000)
	// })
	// })()

	return async (options?: { forceToClean?: boolean }) => {
		if (!isMainThread || !workerManager) return

		const freePool = await workerManager.getFreePool()
		const pool = freePool.pool

		try {
			options = {
				forceToClean: false,
				...options,
			}
			await pool.exec('scanToCleanViews', [viewsPath, options])
		} catch (err) {
			Console.error(err)
		}

		freePool.terminate({
			force: true,
		})

		if (!SERVER_LESS) {
			setTimeout(() => {
				cleanViews()
			}, 300000)
		}
	}
})() // cleanViews

export const cleanAPIDataCache = (() => {
	return async () => {
		if (!isMainThread || !workerManager) return

		const freePool = await workerManager.getFreePool()
		const pool = freePool.pool

		try {
			await pool.exec('scanToCleanAPIDataCache', [dataPath])
		} catch (err) {
			Console.error(err)
		}

		freePool.terminate({
			force: true,
		})

		if (!SERVER_LESS) {
			setTimeout(() => {
				cleanAPIDataCache()
			}, 30000)
		}
	}
})() // cleanAPIDataCache

export const cleanAPIStoreCache = (() => {
	return async () => {
		if (!isMainThread || !workerManager) return

		const freePool = await workerManager.getFreePool()
		const pool = freePool.pool

		try {
			await pool.exec('scanToCleanAPIStoreCache', [storePath])
		} catch (err) {
			Console.error(err)
		}

		freePool.terminate({
			force: true,
		})

		if (!SERVER_LESS) {
			setTimeout(() => {
				cleanAPIStoreCache()
			}, 30000)
		}
	}
})() // cleanAPIStoreCache

export const cleanOther = (() => {
	return async () => {
		if (!isMainThread || !workerManager) return

		const clean = async (path) => {
			if (!path) return

			const freePool = await workerManager.getFreePool()
			const pool = freePool.pool

			try {
				pool.exec('deleteResource', [path])
			} catch (err) {
				Console.error(err)
			}

			freePool.terminate({
				force: true,
			})
		}

		try {
			await Promise.all([
				clean(`${userDataPath}/wsEndpoint.txt`),
				clean(`${workerManagerPath}/counter.txt`),
			])
		} catch (err) {
			Console.error(err)
		}
	}
})()
