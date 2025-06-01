"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var _path = require('path'); var _path2 = _interopRequireDefault(_path);
var _serverconfig = require('../../../../server.config'); var _serverconfig2 = _interopRequireDefault(_serverconfig);


var _CacheManagerworker = require('../../CacheManager.worker'); var _CacheManagerworker2 = _interopRequireDefault(_CacheManagerworker);

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

  const pathname = new URL(url).pathname

  const enableToCache =
    _serverconfig2.default.crawl.enable &&
    (_serverconfig2.default.crawl.routes[pathname] === undefined ||
      _serverconfig2.default.crawl.routes[pathname].enable ||
      _optionalChain([_serverconfig2.default, 'access', _ => _.crawl, 'access', _2 => _2.custom, 'optionalCall', _3 => _3(url)]) === undefined ||
      _optionalChain([_serverconfig2.default, 'access', _4 => _4.crawl, 'access', _5 => _5.custom, 'optionalCall', _6 => _6(url), 'optionalAccess', _7 => _7.enable])) &&
    _serverconfig2.default.crawl.cache.enable &&
    (_serverconfig2.default.crawl.routes[pathname] === undefined ||
      _serverconfig2.default.crawl.routes[pathname].cache.enable ||
      _optionalChain([_serverconfig2.default, 'access', _8 => _8.crawl, 'access', _9 => _9.custom, 'optionalCall', _10 => _10(url)]) === undefined ||
      _optionalChain([_serverconfig2.default, 'access', _11 => _11.crawl, 'access', _12 => _12.custom, 'optionalCall', _13 => _13(url), 'optionalAccess', _14 => _14.cache, 'access', _15 => _15.enable]))

  const cacheManager = enableToCache ? _CacheManagerworker2.default.call(void 0, url, cachePath) : null

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

    await cacheManager.remove(options)
  } // remove

  const rename = async (params) => {
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

exports. default = CacheManager
