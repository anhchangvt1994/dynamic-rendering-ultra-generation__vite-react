"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
var _serverconfig = require('../../server.config'); var _serverconfig2 = _interopRequireDefault(_serverconfig);

var _InitEnv = require('../../utils/InitEnv');

 const convertUrlHeaderToQueryString = (
  {
    url,
    res,
    simulateBot,
    isISR,
  }




 = {
    url: '',
    simulateBot: false,
    isISR: false,
  }
) => {
  if (!url || !res) return ''

  const urlInfo = new URL(url)

  const routeInfo =
    _nullishCoalesce(_nullishCoalesce(_optionalChain([_serverconfig2.default, 'access', _ => _.routes, 'access', _2 => _2.list, 'optionalAccess', _3 => _3[urlInfo.pathname]]), () => (
    _optionalChain([_serverconfig2.default, 'access', _4 => _4.routes, 'access', _5 => _5.custom, 'optionalCall', _6 => _6(url)]))), () => (
    (_serverconfig2.default.routes )))

  const routePreviewInfo =
    routeInfo.pointsTo || routeInfo.preview || routeInfo.loader || routeInfo

  const routeAllowContent = isISR
    ? routePreviewInfo.content === 'same'
      ? routePreviewInfo.content
      : routePreviewInfo.content === 'all'
        ? _serverconfig2.default.crawl.content === 'same'
          ? routePreviewInfo.content
          : _serverconfig2.default.crawl.content
        : _serverconfig2.default.crawl.content === 'all'
          ? routePreviewInfo.content
          : (() => {
              if (typeof _serverconfig2.default.crawl.content === 'string')
                return routePreviewInfo.content

              const routePreviewInfoContent = new Set(routePreviewInfo.content)
              const tmpRouteAllowContent = (
                _serverconfig2.default.crawl.content 
              ).filter((item) => routePreviewInfoContent.has(item))

              return !!tmpRouteAllowContent.length
                ? tmpRouteAllowContent
                : routePreviewInfo.content
            })() || routePreviewInfo.content
    : routePreviewInfo.content

  let botInfoStringify

  if (simulateBot) {
    botInfoStringify = JSON.stringify({
      isBot: true,
      name: 'puppeteer-ssr',
    } )
  } else {
    botInfoStringify = JSON.stringify(_optionalChain([res, 'access', _7 => _7.cookies, 'optionalAccess', _8 => _8.botInfo]))
  }

  const deviceInfo = _nullishCoalesce(_optionalChain([res, 'access', _9 => _9.cookies, 'optionalAccess', _10 => _10.deviceInfo]), () => ( {}))

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
          ...(_nullishCoalesce(_optionalChain([res, 'access', _11 => _11.cookies, 'optionalAccess', _12 => _12.deviceInfo]), () => ( {}))),
          isMobile:
            deviceInfo.isMobile && deviceType !== 'desktop' ? true : false,
          type: deviceType,
        })

  const localeInfoStringify = JSON.stringify(_optionalChain([res, 'access', _13 => _13.cookies, 'optionalAccess', _14 => _14.localeInfo]))
  const environmentInfoStringify = JSON.stringify(_optionalChain([res, 'access', _15 => _15.cookies, 'optionalAccess', _16 => _16.environmentInfo]))

  let urlFormatted = `${url}${
    url.indexOf('?') === -1 ? '?' : '&'
  }botInfo=${botInfoStringify}&${deviceInfoStringify ? 'deviceInfo=' + deviceInfoStringify + '&' : ''}localeInfo=${localeInfoStringify}&environmentInfo=${environmentInfoStringify}`.trim()

  return urlFormatted
}; exports.convertUrlHeaderToQueryString = convertUrlHeaderToQueryString // formatUrl

 const getUrl = (res, req) => {
  if (!res) return ''

  const pathname = res.urlForCrawler

  return (
    (_InitEnv.PROCESS_ENV.ENABLE_URL_TESTING ? req.getQuery('urlTesting') : '') ||
    req.getQuery('url') ||
    _InitEnv.PROCESS_ENV.BASE_URL + pathname
  ).trim()
}; exports.getUrl = getUrl // getUrl

 const getPathname = (res, req) => {
  if (!res || !req) return

  return res.urlForCrawler || req.getUrl()
}; exports.getPathname = getPathname // getPathname
