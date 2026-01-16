import fs from 'fs'
import ServerConfig from '../../../server.config'
import { getViewsPath } from '../../../utils/PathHandler'
import { getFileInfo, getKey } from '../Cache.worker/utils'
import CacheManager from './CacheManager.worker/utils'

export const isPointsToRoute = (url: string) => {
  const urlInfo = new URL(url)
  const routeInfo =
    ServerConfig.routes.list?.[urlInfo.pathname] ??
    ServerConfig.routes.custom?.(url) ??
    (ServerConfig.routes as any)

  return !!routeInfo?.pointsTo
} // isEnablePreview

export const isAvailablePointsTo = async (url: string) => {
  const urlInfo = new URL(url)
  const routeInfo =
    ServerConfig.routes.list?.[urlInfo.pathname] ??
    ServerConfig.routes.custom?.(url) ??
    (ServerConfig.routes as any)

  if (!routeInfo || !routeInfo.pointsTo) return false

  const viewsPath = getViewsPath()
  const urlPointsTo = `${routeInfo.pointsTo.url}${!!urlInfo.search && decodeURI(urlInfo.search)}`

  const key = getKey(urlPointsTo)
  let file = `${viewsPath}/${key}.br`

  switch (true) {
    case fs.existsSync(file):
      break
    case fs.existsSync(`${viewsPath}/${key}.renew.br`):
      file = `${viewsPath}/${key}.renew.br`
      break
    default:
      file = `${viewsPath}/${key}.raw.br`
      break
  }

  if (!fs.existsSync(file)) return false

  const info = await getFileInfo(file)

  if (!info || info.size === 0) return false

  return true
} // isAvailablePointsTo

export const getOtherUrlsBaseOnDevice = (url: string) => {
  const urlInfo = new URL(url)
  const routeInfo =
    ServerConfig.routes.list?.[urlInfo.pathname] ??
    ServerConfig.routes.custom?.(url) ??
    (ServerConfig.routes as any)

  if (!routeInfo) return []

  const routePreviewInfo = routeInfo.pointsTo || routeInfo.preview
  const content = routePreviewInfo?.content ?? routeInfo.content

  if (!content) return []

  const urlList: string[] = []
  const viewsPath = getViewsPath()

  if (content === 'all' || (Array.isArray(content) && content.length > 1)) {
    const contentList = content === 'all' ? ['desktop', 'mobile'] : content

    for (const content of contentList) {
      if (url.includes(`"type":"${content}"`)) continue

      const tmpUrl = url.replace(
        /deviceInfo=([^&]*)/g,
        `deviceInfo={"type":"${content}", "isMobile":${content === 'mobile'}}`
      )
      const cacheManager = CacheManager(tmpUrl, viewsPath)

      if (cacheManager.isExist()) continue

      urlList.push(tmpUrl)
    }
  }

  return urlList
} // getOtherUrlsBaseOnDevice
