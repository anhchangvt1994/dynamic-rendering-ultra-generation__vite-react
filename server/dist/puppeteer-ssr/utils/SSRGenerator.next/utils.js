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
var _fs = require('fs')
var _fs2 = _interopRequireDefault(_fs)
var _serverconfig = require('../../../server.config')
var _serverconfig2 = _interopRequireDefault(_serverconfig)
var _PathHandler = require('../../../utils/PathHandler')
var _utils = require('../Cache.worker/utils')
var _utils3 = require('./CacheManager.worker/utils')
var _utils4 = _interopRequireDefault(_utils3)

const isPointsToRoute = (url) => {
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

  return !!_optionalChain([routeInfo, 'optionalAccess', (_7) => _7.pointsTo])
}
exports.isPointsToRoute = isPointsToRoute // isEnablePreview

const isAvailablePointsTo = async (url) => {
  const urlInfo = new URL(url)
  const routeInfo = _nullishCoalesce(
    _nullishCoalesce(
      _optionalChain([
        _serverconfig2.default,
        'access',
        (_8) => _8.routes,
        'access',
        (_9) => _9.list,
        'optionalAccess',
        (_10) => _10[urlInfo.pathname],
      ]),
      () =>
        _optionalChain([
          _serverconfig2.default,
          'access',
          (_11) => _11.routes,
          'access',
          (_12) => _12.custom,
          'optionalCall',
          (_13) => _13(url),
        ])
    ),
    () => _serverconfig2.default.routes
  )

  if (!routeInfo || !routeInfo.pointsTo) return false

  const viewsPath = _PathHandler.getViewsPath.call(void 0)
  const urlPointsTo = `${routeInfo.pointsTo.url}${!!urlInfo.search && decodeURI(urlInfo.search)}`

  const key = _utils.getKey.call(void 0, urlPointsTo)
  let file = `${viewsPath}/${key}.br`

  switch (true) {
    case _fs2.default.existsSync(file):
      break
    case _fs2.default.existsSync(`${viewsPath}/${key}.renew.br`):
      file = `${viewsPath}/${key}.renew.br`
      break
    default:
      file = `${viewsPath}/${key}.raw.br`
      break
  }

  if (!_fs2.default.existsSync(file)) return false

  const info = await _utils.getFileInfo.call(void 0, file)

  if (!info || info.size === 0) return false

  return true
}
exports.isAvailablePointsTo = isAvailablePointsTo // isAvailablePointsTo

const getOtherUrlsBaseOnDevice = (url) => {
  const urlInfo = new URL(url)
  const routeInfo = _nullishCoalesce(
    _nullishCoalesce(
      _optionalChain([
        _serverconfig2.default,
        'access',
        (_14) => _14.routes,
        'access',
        (_15) => _15.list,
        'optionalAccess',
        (_16) => _16[urlInfo.pathname],
      ]),
      () =>
        _optionalChain([
          _serverconfig2.default,
          'access',
          (_17) => _17.routes,
          'access',
          (_18) => _18.custom,
          'optionalCall',
          (_19) => _19(url),
        ])
    ),
    () => _serverconfig2.default.routes
  )

  if (!routeInfo) return []

  const routePreviewInfo = routeInfo.pointsTo || routeInfo.preview
  const content = _nullishCoalesce(
    _optionalChain([routePreviewInfo, 'optionalAccess', (_20) => _20.content]),
    () => routeInfo.content
  )

  if (!content) return []

  const urlList = []
  const viewsPath = _PathHandler.getViewsPath.call(void 0)

  if (content === 'all' || (Array.isArray(content) && content.length > 1)) {
    const contentList = content === 'all' ? ['desktop', 'mobile'] : content

    for (const content of contentList) {
      if (url.includes(`"type":"${content}"`)) continue

      const tmpUrl = url.replace(
        /deviceInfo=([^&]*)/g,
        `deviceInfo={"type":"${content}", "isMobile":${content === 'mobile'}}`
      )
      const cacheManager = _utils4.default.call(void 0, tmpUrl, viewsPath)

      if (cacheManager.isExist()) continue

      urlList.push(tmpUrl)
    }
  }

  return urlList
}
exports.getOtherUrlsBaseOnDevice = getOtherUrlsBaseOnDevice // getOtherUrlsBaseOnDevice
