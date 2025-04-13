import path from 'path'
import ServerConfig from '../../../../server.config'
import { ISSRResult } from '../../../types'
import { ICacheSetParams } from '../../Cache.worker/utils'
import { default as CacheManagerRoot } from '../../CacheManager.worker'

const maintainFile = path.resolve(__dirname, '../../../../maintain.html')

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
  const urlInfo = new URL(url)
  const routeInfo =
    ServerConfig.routes.list?.[urlInfo.pathname] ??
    ServerConfig.routes.custom?.(url) ??
    (ServerConfig.routes as any)
  const routePreviewInfo = routeInfo?.pointsTo ?? routeInfo?.preview
  const enableToCache = !!routePreviewInfo || options.forceToCache
  const urlToPreview =
    routePreviewInfo && routePreviewInfo.url
      ? `${routePreviewInfo.url}${urlInfo.search ? decodeURI(urlInfo.search) + '&' : '?'}infoTxt=${url}`
      : url

  const cacheManager =
    enableToCache && urlToPreview
      ? CacheManagerRoot(urlToPreview, cachePath)
      : null

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

  const getCorrectUrl = () => urlToPreview // getCorrectUrl

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
