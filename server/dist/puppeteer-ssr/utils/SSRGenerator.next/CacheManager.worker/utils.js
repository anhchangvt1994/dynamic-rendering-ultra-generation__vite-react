"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var _path = require('path'); var _path2 = _interopRequireDefault(_path);
var _serverconfig = require('../../../../server.config'); var _serverconfig2 = _interopRequireDefault(_serverconfig);





var _utils = require('../../Cache.worker/utils');
var _utils3 = require('../../CacheManager.worker/utils'); var _utils4 = _interopRequireDefault(_utils3);

const maintainFile = _path2.default.resolve(__dirname, '../../../../503-maintain.html')

const CacheManager = (
  url,
  cachePath,
  options


) => {
  options = {
    forceToCache: false,
    ...(options || {}),
  }

  const urlInfo = new URL(url)
  const routeInfo =
    _nullishCoalesce(_nullishCoalesce(_optionalChain([_serverconfig2.default, 'access', _ => _.routes, 'access', _2 => _2.list, 'optionalAccess', _3 => _3[urlInfo.pathname]]), () => (
    _optionalChain([_serverconfig2.default, 'access', _4 => _4.routes, 'access', _5 => _5.custom, 'optionalCall', _6 => _6(url)]))), () => (
    (_serverconfig2.default.routes )))
  const routePreviewInfo = _nullishCoalesce(_optionalChain([routeInfo, 'optionalAccess', _7 => _7.pointsTo]), () => ( _optionalChain([routeInfo, 'optionalAccess', _8 => _8.preview])))
  const enableToCache =
    !!routePreviewInfo || _optionalChain([routeInfo, 'access', _9 => _9.loader, 'optionalAccess', _10 => _10.enable]) || options.forceToCache
  const urlToPreview =
    routePreviewInfo && routePreviewInfo.url
      ? `${routePreviewInfo.url}${urlInfo.search ? decodeURI(urlInfo.search) + '&' : '?'}infoTxt=${url}`
      : url
  const cacheManager =
    enableToCache && urlToPreview
      ? _utils4.default.call(void 0, urlToPreview, cachePath)
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

  const achieve = async () => {
    if (!cacheManager) return

    const result = await cacheManager.achieve()

    return result
  } // achieve

  const set = async (params) => {
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

  const remove = async (options) => {
    if (!cacheManager) return

    options = {
      force: false,
      ...options,
    }

    await cacheManager.remove(options)
  } // remove

  const rename = async (params) => {
    if (!cacheManager) return

    await cacheManager.rename(params)
  } // rename

  const getStatus = () => {
    if (!cacheManager) return

    return _utils.getStatus.call(void 0, urlToPreview, cachePath)
  } // getStatus

  const isExist = () => {
    if (!cacheManager) return

    return _utils.isExist.call(void 0, urlToPreview, cachePath)
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

exports. default = CacheManager
