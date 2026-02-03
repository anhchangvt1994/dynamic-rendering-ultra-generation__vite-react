import { HttpRequest, HttpResponse } from 'uWebSockets.js'
import ServerConfig from '../../server.config'
import { IBotInfo } from '../../types'
import { PROCESS_ENV } from '../../utils/InitEnv'

export const convertUrlHeaderToQueryString = (
  {
    url,
    res,
    simulateBot,
    isISR,
  }: {
    url: string
    res?: HttpResponse
    simulateBot?: boolean
    isISR?: boolean
  } = {
    url: '',
    simulateBot: false,
    isISR: false,
  }
) => {
  if (!url || !res) return ''

  const urlInfo = new URL(url)

  const routeInfo =
    ServerConfig.routes.list?.[urlInfo.pathname] ??
    ServerConfig.routes.custom?.(url) ??
    (ServerConfig.routes as any)

  const routePreviewInfo =
    routeInfo.pointsTo || routeInfo.preview || routeInfo.loader || routeInfo

  const routeAllowContent = isISR
    ? routePreviewInfo.content === 'same'
      ? routePreviewInfo.content
      : routePreviewInfo.content === 'all'
        ? ServerConfig.crawl.content === 'same'
          ? ServerConfig.crawl.content
          : routePreviewInfo.content
        : ServerConfig.crawl.content === 'all'
          ? routePreviewInfo.content
          : (() => {
              if (typeof ServerConfig.crawl.content === 'string')
                return routePreviewInfo.content

              const routePreviewInfoContent = new Set(routePreviewInfo.content)
              const tmpRouteAllowContent = (
                ServerConfig.crawl.content as string[]
              ).filter((item) => routePreviewInfoContent.has(item))

              return !!tmpRouteAllowContent.length
                ? tmpRouteAllowContent
                : routePreviewInfo.content
            })() || routePreviewInfo.content
    : routePreviewInfo.content

  let botInfoStringify

  if (simulateBot) {
    const botInfoFormatted = {
      isBot: true,
      name: 'puppeteer-ssr',
    }

    botInfoStringify = JSON.stringify(botInfoFormatted as IBotInfo)
  } else {
    botInfoStringify = JSON.stringify(res.cookies?.botInfo)
  }

  const deviceInfo = res.cookies?.deviceInfo ?? {}

  const deviceType =
    routeAllowContent === 'same'
      ? routeAllowContent
      : routeAllowContent === 'all' ||
          routeAllowContent.includes(deviceInfo.type)
        ? deviceInfo.type
        : routeAllowContent[0]

  const deviceInfoStringify =
    deviceType === 'same'
      ? ''
      : JSON.stringify({
          ...(res.cookies?.deviceInfo ?? {}),
          isMobile:
            deviceInfo.isMobile && deviceType !== 'desktop' ? true : false,
          type: deviceType,
        })

  const localeInfoStringify = JSON.stringify(res.cookies?.localeInfo)
  const environmentInfoStringify = JSON.stringify(res.cookies?.environmentInfo)

  let urlFormatted = `${url}${
    url.indexOf('?') === -1 ? '?' : '&'
  }botInfo=${botInfoStringify}&${deviceInfoStringify ? 'deviceInfo=' + deviceInfoStringify + '&' : ''}localeInfo=${localeInfoStringify}&environmentInfo=${environmentInfoStringify}`.trim()

  return urlFormatted
} // formatUrl

export const getUrl = (res: HttpResponse, req: HttpRequest) => {
  if (!res) return ''

  const pathname = res.urlForCrawler

  return (
    (PROCESS_ENV.ENABLE_URL_TESTING ? req.getQuery('urlTesting') : '') ||
    req.getQuery('url') ||
    PROCESS_ENV.BASE_URL + pathname
  ).trim()
} // getUrl

export const getPathname = (res: HttpResponse, req: HttpRequest) => {
  if (!res || !req) return

  return res.urlForCrawler || req.getUrl()
} // getPathname
