import { HttpRequest, HttpResponse } from 'uWebSockets.js'
import ServerConfig from '../../server.config'
import { IBotInfo } from '../../types'
import { PROCESS_ENV } from '../../utils/InitEnv'

export const convertUrlHeaderToQueryString = (
  {
    url,
    res,
    simulateBot,
  }: {
    url: string
    res?: HttpResponse
    simulateBot?: boolean
  } = {
    url: '',
    simulateBot: false,
  }
) => {
  if (!url || !res) return ''

  const urlInfo = new URL(url)

  const routeInfo =
    ServerConfig.routes.list?.[urlInfo.pathname] ??
    ServerConfig.routes.custom?.(url) ??
    (ServerConfig.routes as any)

  const routePreviewInfo =
    routeInfo?.pointsTo ?? routeInfo?.preview ?? routeInfo.loader

  const routeAllowContent =
    routePreviewInfo?.content ?? ServerConfig.crawl.content

  let botInfoStringify

  if (simulateBot) {
    botInfoStringify = JSON.stringify({
      isBot: true,
      name: 'puppeteer-ssr',
    } as IBotInfo)
  } else {
    botInfoStringify = JSON.stringify(res.cookies?.botInfo)
  }

  const deviceInfo = res.cookies?.deviceInfo ?? {}
  const deviceType =
    routeAllowContent === 'same'
      ? 'same'
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
