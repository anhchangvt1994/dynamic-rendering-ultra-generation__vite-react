'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj }
}
function _nullishCoalesce(lhs, rhsFn) {
  if (lhs != null) {
    return lhs
  } else {
    return rhsFn()
  }
}
function _optionalChain(ops) {
  let lastAccessLHS = undefined
  let value = ops[0]
  let i = 1
  while (i < ops.length) {
    const op = ops[i]
    const fn = ops[i + 1]
    i += 2
    if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) {
      return undefined
    }
    if (op === 'access' || op === 'optionalAccess') {
      lastAccessLHS = value
      value = fn(value)
    } else if (op === 'call' || op === 'optionalCall') {
      value = fn((...args) => value.call(lastAccessLHS, ...args))
      lastAccessLHS = undefined
    }
  }
  return value
}
var _serverconfig = require('../../server.config')
var _serverconfig2 = _interopRequireDefault(_serverconfig)

var _InitEnv = require('../../utils/InitEnv')

const convertUrlHeaderToQueryString = (
  { url, res, simulateBot } = {
    url: '',
    simulateBot: false,
  }
) => {
  if (!url || !res) return ''

  const urlInfo = new URL(url)

  const routeInfo = _nullishCoalesce(
    _nullishCoalesce(
      _optionalChain([
        _serverconfig2.default,
        'access',
        (_) => _.routes,
        'access',
        (_2) => _2.list,
        'optionalAccess',
        (_3) => _3[urlInfo.pathname],
      ]),
      () =>
        _optionalChain([
          _serverconfig2.default,
          'access',
          (_4) => _4.routes,
          'access',
          (_5) => _5.custom,
          'optionalCall',
          (_6) => _6(url),
        ])
    ),
    () => _serverconfig2.default.routes
  )

  const routePreviewInfo = _nullishCoalesce(
    _nullishCoalesce(
      _optionalChain([routeInfo, 'optionalAccess', (_7) => _7.pointsTo]),
      () => _optionalChain([routeInfo, 'optionalAccess', (_8) => _8.preview])
    ),
    () => routeInfo.loader
  )

  const routeAllowContent = _nullishCoalesce(
    _optionalChain([routePreviewInfo, 'optionalAccess', (_9) => _9.content]),
    () => _serverconfig2.default.crawl.content
  )

  let botInfoStringify

  if (simulateBot) {
    botInfoStringify = JSON.stringify({
      isBot: true,
      name: 'puppeteer-ssr',
    })
  } else {
    botInfoStringify = JSON.stringify(
      _optionalChain([
        res,
        'access',
        (_10) => _10.cookies,
        'optionalAccess',
        (_11) => _11.botInfo,
      ])
    )
  }

  const deviceInfo = _nullishCoalesce(
    _optionalChain([
      res,
      'access',
      (_12) => _12.cookies,
      'optionalAccess',
      (_13) => _13.deviceInfo,
    ]),
    () => ({})
  )
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
          ..._nullishCoalesce(
            _optionalChain([
              res,
              'access',
              (_14) => _14.cookies,
              'optionalAccess',
              (_15) => _15.deviceInfo,
            ]),
            () => ({})
          ),
          isMobile:
            deviceInfo.isMobile && deviceType !== 'desktop' ? true : false,
          type: deviceType,
        })

  const localeInfoStringify = JSON.stringify(
    _optionalChain([
      res,
      'access',
      (_16) => _16.cookies,
      'optionalAccess',
      (_17) => _17.localeInfo,
    ])
  )
  const environmentInfoStringify = JSON.stringify(
    _optionalChain([
      res,
      'access',
      (_18) => _18.cookies,
      'optionalAccess',
      (_19) => _19.environmentInfo,
    ])
  )

  let urlFormatted = `${url}${
    url.indexOf('?') === -1 ? '?' : '&'
  }botInfo=${botInfoStringify}&${deviceInfoStringify ? 'deviceInfo=' + deviceInfoStringify + '&' : ''}localeInfo=${localeInfoStringify}&environmentInfo=${environmentInfoStringify}`.trim()

  return urlFormatted
}
exports.convertUrlHeaderToQueryString = convertUrlHeaderToQueryString // formatUrl

const getUrl = (res, req) => {
  if (!res) return ''

  const pathname = res.urlForCrawler

  return (
    (_InitEnv.PROCESS_ENV.ENABLE_URL_TESTING
      ? req.getQuery('urlTesting')
      : '') ||
    req.getQuery('url') ||
    _InitEnv.PROCESS_ENV.BASE_URL + pathname
  ).trim()
}
exports.getUrl = getUrl // getUrl

const getPathname = (res, req) => {
  if (!res || !req) return

  return res.urlForCrawler || req.getUrl()
}
exports.getPathname = getPathname // getPathname
