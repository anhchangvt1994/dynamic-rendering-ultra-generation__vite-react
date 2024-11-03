import fs from 'fs'
import path from 'path'
import ServerConfig from '../../server.config'
import Console from '../ConsoleHandler'
import { PROCESS_ENV } from '../InitEnv'

export const getPagesPath = () => {
	return PROCESS_ENV.IS_SERVER
		? (() => {
				let root = '/tmp'
				if (ServerConfig.rootCache) {
					if (fs.existsSync(ServerConfig.rootCache)) {
						root = ServerConfig.rootCache
					} else {
						try {
							fs.mkdirSync(ServerConfig.rootCache)
							root = ServerConfig.rootCache
						} catch (err) {
							Console.error(err.message)
						}
					}
				}

				if (fs.existsSync(root)) return root + '/pages'

				return path.resolve(
					__dirname,
					'../../puppeteer-ssr/utils/Cache.worker/pages'
				)
		  })()
		: path.resolve(__dirname, '../../puppeteer-ssr/utils/Cache.worker/pages')
} // getPagesPath

export const getDataPath = () => {
	return PROCESS_ENV.IS_SERVER
		? (() => {
				let root = '/tmp'
				if (ServerConfig.rootCache) {
					if (fs.existsSync(ServerConfig.rootCache)) {
						root = ServerConfig.rootCache
					} else {
						try {
							fs.mkdirSync(ServerConfig.rootCache)
							root = ServerConfig.rootCache
						} catch (err) {
							Console.error(err.message)
						}
					}
				}

				if (fs.existsSync(root)) return root + '/data'

				return path.resolve(__dirname, '../../api/utils/CacheManager/data')
		  })()
		: path.resolve(__dirname, '../../api/utils/CacheManager/data')
} // getDataPath

export const getStorePath = () => {
	return PROCESS_ENV.IS_SERVER
		? (() => {
				let root = '/tmp'
				if (ServerConfig.rootCache) {
					if (fs.existsSync(ServerConfig.rootCache)) {
						root = ServerConfig.rootCache
					} else {
						try {
							fs.mkdirSync(ServerConfig.rootCache)
							root = ServerConfig.rootCache
						} catch (err) {
							Console.error(err.message)
						}
					}
				}

				if (fs.existsSync(root)) return root + '/store'

				return path.resolve(__dirname, '../../api/utils/CacheManager/store')
		  })()
		: path.resolve(__dirname, '../../api/utils/CacheManager/store')
} // getStorePath

export const getUserDataPath = () => {
	return PROCESS_ENV.IS_SERVER
		? (() => {
				const tmpPath = '/tmp'
				if (fs.existsSync(tmpPath)) return tmpPath + '/browsers'

				return path.resolve(__dirname, '../../puppeteer-ssr/browsers')
		  })()
		: path.resolve(__dirname, '../../puppeteer-ssr/browsers')
} // getUserDataPath

export const getWorkerManagerPath = () => {
	return PROCESS_ENV.IS_SERVER
		? (() => {
				const tmpPath = '/tmp'
				if (fs.existsSync(tmpPath)) return tmpPath + '/WorkerManager'

				return path.resolve(__dirname, '../../utils/WorkerManager')
		  })()
		: path.resolve(__dirname, '../../utils/WorkerManager')
} // getWorkerManagerPath
