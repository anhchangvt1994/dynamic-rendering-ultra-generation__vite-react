import ServerConfig from '../server.config'
import fs from 'fs-extra'
import path from 'path'
import { PROCESS_ENV } from './InitEnv'

const _getViewsPath = () => {
	const viewsPath = PROCESS_ENV.IS_SERVER
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
							console.error(err.message)
						}
					}
				}

				if (fs.existsSync(root)) return root + '/views'

				return path.resolve(
					__dirname,
					'../../puppeteer-ssr/utils/Cache.worker/views'
				)
		  })()
		: path.resolve(__dirname, '../../puppeteer-ssr/utils/Cache.worker/views')

	if (!fs.existsSync(viewsPath)) {
		try {
			fs.mkdirSync(viewsPath)
		} catch (err) {
			console.error(err)
		}
	}

	return viewsPath
} // getViewsPath

const viewsPath = _getViewsPath()

if (fs.pathExistsSync(viewsPath)) {
	try {
		fs.emptyDirSync(viewsPath)
		fs.remove(viewsPath)
	} catch (err) {
		console.error(err)
	}
}
