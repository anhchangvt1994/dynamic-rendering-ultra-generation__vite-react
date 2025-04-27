import fs from 'fs'
import ServerConfig from '../../../server.config'
import { getViewsPath } from '../../../utils/PathHandler'
import { getFileInfo, getKey } from '../Cache.worker/utils'

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
  const urlPointsTo = routeInfo.pointsTo.url

  const key = getKey(urlPointsTo)
  let file = `${viewsPath}/${key}.br`
  let isRaw = false

  switch (true) {
    case fs.existsSync(file):
      break
    case fs.existsSync(`${viewsPath}/${key}.renew.br`):
      file = `${viewsPath}/${key}.renew.br`
      break
    default:
      file = `${viewsPath}/${key}.raw.br`
      isRaw = true
      break
  }

  if (!fs.existsSync(file)) return false

  const info = await getFileInfo(file)

  if (!info || info.size === 0) return false

  return true
} // isAvailablePointsTo
