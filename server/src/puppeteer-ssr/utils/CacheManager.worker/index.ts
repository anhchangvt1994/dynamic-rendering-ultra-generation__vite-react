import fs from 'fs'
import path from 'path'
import { resourceExtension } from '../../../constants'
import ServerConfig from '../../../server.config'
import Console from '../../../utils/ConsoleHandler'
import WorkerManager from '../../../utils/WorkerManager'
import { ISSRResult } from '../../types'
import {
	ICacheSetParams,
	getKey as getCacheKey,
	getFileInfo,
	isExist as isCacheExist,
	getStatus as getCacheStatus,
} from '../Cache.worker/utils'
import { getPagesPath } from '../../../utils/PathHandler'

const pagesPath = getPagesPath()

const workerManager = WorkerManager.init(
	path.resolve(__dirname, `./../Cache.worker/index.${resourceExtension}`),
	{
		minWorkers: 1,
		maxWorkers: 3,
	},
	['get', 'set', 'renew', 'remove', 'rename']
)

const maintainFile = path.resolve(__dirname, '../../../maintain.html')

const CacheManager = (url: string) => {
	const pathname = new URL(url).pathname

	const enableToCache =
		ServerConfig.crawl.enable &&
		(ServerConfig.crawl.routes[pathname] === undefined ||
			ServerConfig.crawl.routes[pathname].enable ||
			ServerConfig.crawl.custom?.(url) === undefined ||
			ServerConfig.crawl.custom?.(url)?.enable) &&
		ServerConfig.crawl.cache.enable &&
		(ServerConfig.crawl.routes[pathname] === undefined ||
			ServerConfig.crawl.routes[pathname].cache.enable ||
			ServerConfig.crawl.custom?.(url) === undefined ||
			ServerConfig.crawl.custom?.(url)?.cache.enable)

	const get = async () => {
		if (!enableToCache)
			return {
				response: maintainFile,
				status: 503,
				createdAt: new Date(),
				updatedAt: new Date(),
				requestedAt: new Date(),
				ttRenderMs: 200,
				available: false,
				isInit: true,
			}

		const freePool = await workerManager.getFreePool()
		const pool = freePool.pool
		let result

		try {
			result = await pool.exec('get', [url])
		} catch (err) {
			Console.error(err)
		}

		freePool.terminate({
			force: true,
		})

		return result
	} // get

	const achieve = async (): Promise<ISSRResult> => {
		if (!enableToCache) return
		if (!url) {
			Console.error('Need provide "url" param!')
			return
		}

		const key = getCacheKey(url)
		let file = `${pagesPath}/${key}.br`
		let isRaw = false

		switch (true) {
			case fs.existsSync(file):
				break
			case fs.existsSync(`${pagesPath}/${key}.renew.br`):
				file = `${pagesPath}/${key}.renew.br`
				break
			default:
				file = `${pagesPath}/${key}.raw.br`
				isRaw = true
				break
		}

		if (!fs.existsSync(file)) return

		const info = await getFileInfo(file)

		if (!info || info.size === 0) return

		// await setRequestTimeInfo(file, new Date())

		return {
			file,
			response: file,
			status: 200,
			createdAt: info.createdAt,
			updatedAt: info.updatedAt,
			requestedAt: new Date(),
			ttRenderMs: 200,
			available: true,
			isInit: false,
			isRaw,
		}
	} // achieve

	const set = async (params: ICacheSetParams) => {
		if (!enableToCache)
			return {
				html: params.html,
				response: maintainFile,
				status: params.html ? 200 : 503,
			}

		const freePool = await workerManager.getFreePool()
		const pool = freePool.pool
		let result

		try {
			result = await pool.exec('set', [params])
		} catch (err) {
			Console.error(err)
		}

		freePool.terminate({
			force: true,
		})

		return result
	} // set

	const renew = async () => {
		const freePool = await workerManager.getFreePool()
		const pool = freePool.pool
		let result

		try {
			result = await pool.exec('renew', [url])
		} catch (err) {
			Console.error(err)
		}

		freePool.terminate({
			force: true,
		})

		return result
	} // renew

	const remove = async (url: string, options?: { force?: boolean }) => {
		if (!enableToCache) return

		options = {
			force: false,
			...options,
		}

		if (!options.force) {
			const tmpCacheInfo = await achieve()

			if (tmpCacheInfo) return
		}

		const freePool = await workerManager.getFreePool()
		const pool = freePool.pool

		try {
			await pool.exec('remove', [url])
		} catch (err) {
			Console.error(err)
		}

		freePool.terminate({
			force: true,
		})
	} // remove

	const rename = async (params: { url: string; type?: 'raw' | 'renew' }) => {
		if (!enableToCache || !params || !params.url) return

		const freePool = await workerManager.getFreePool()
		const pool = freePool.pool

		try {
			await pool.exec('rename', [params])
		} catch (err) {
			Console.error(err)
		}

		freePool.terminate({
			force: true,
		})
	} // rename

	const getStatus = () => {
		return getCacheStatus(url)
	} // getStatus

	const isExist = () => {
		return isCacheExist(url)
	} // isExist

	return {
		achieve,
		get,
		getStatus,
		set,
		renew,
		remove,
		rename,
		isExist,
	}
}

export default CacheManager
