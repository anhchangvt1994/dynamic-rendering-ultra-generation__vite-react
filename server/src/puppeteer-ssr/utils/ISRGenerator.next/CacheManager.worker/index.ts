import path from 'path'
import ServerConfig from '../../../../server.config'
import { ISSRResult } from '../../../types'
import { ICacheSetParams } from '../../Cache.worker/utils'
import { default as CacheManagerRoot } from '../../CacheManager.worker'

const maintainFile = path.resolve(__dirname, '../../../../503-maintain.html')

const CacheManager = (
  url: string,
  cachePath: string,
  options?: {
    forceToCache?: boolean
  }
) => {
  options = {
    forceToCache: false,
    ...(options || {}),
  }

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

  const cacheManager = enableToCache ? CacheManagerRoot(url, cachePath) : null

  const get = async () => {
    if (!cacheManager)
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

    const result = await cacheManager.get()

    return result
  } // get

  const achieve = async (): Promise<ISSRResult> => {
    if (!cacheManager) return

    const result = await cacheManager.achieve()

    return result
  } // achieve

  const set = async (params: ICacheSetParams) => {
    if (!cacheManager)
      return {
        html: params.html,
        response: maintainFile,
        status: params.html ? 200 : 503,
      }

    const result = await cacheManager.set(params)

    return result
  } // set

  const renew = async () => {
    if (!cacheManager) return

    const result = await cacheManager.renew()

    return result
  } // renew

  const remove = async (options?: { force?: boolean }) => {
    if (!cacheManager) return

    await cacheManager.remove(options)
  } // remove

  const rename = async (params?: { type?: 'raw' | 'renew' }) => {
    if (!cacheManager) return

    await cacheManager.rename(params)
  } // rename

  const getStatus = () => {
    if (!cacheManager) return

    return cacheManager.getStatus()
  } // getStatus

  const isExist = () => {
    if (!cacheManager) return

    return cacheManager.isExist()
  } // isExist

  const getCorrectUrl = () => url // getCorrectUrl

  return {
    achieve,
    get,
    getStatus,
    set,
    renew,
    remove,
    rename,
    isExist,
    getCorrectUrl,
  }
}

export default CacheManager
