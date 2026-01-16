"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _fs = require('fs'); var _fs2 = _interopRequireDefault(_fs);
var _ConsoleHandler = require('../../../utils/ConsoleHandler'); var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler);












var _utils = require('../Cache.worker/utils');

const CacheManager = (url, cachePath) => {
  const get = async () => {
    let result

    try {
      result = await _utils.get.call(void 0, url, cachePath)
    } catch (err) {
      _ConsoleHandler2.default.error(err)
    }

    return result
  } // get

  const achieve = async () => {
    if (!url) {
      _ConsoleHandler2.default.error('Need provide "url" param!')
      return
    }

    const key = _utils.getKey.call(void 0, url)
    let file = `${cachePath}/${key}.br`
    let isRaw = false

    switch (true) {
      case _fs2.default.existsSync(file):
        break
      case _fs2.default.existsSync(`${cachePath}/${key}.renew.br`):
        file = `${cachePath}/${key}.renew.br`
        break
      default:
        file = `${cachePath}/${key}.raw.br`
        isRaw = true
        break
    }

    if (!_fs2.default.existsSync(file)) return

    const info = await _utils.getFileInfo.call(void 0, file)

    if (!info || info.size === 0) return

    // await setRequestTimeInfo(file, new Date())

    return {
      file,
      response: file,
      status: 200,
      createdAt: info.createdAt,
      updatedAt: info.updatedAt,
      requestedAt: new Date(),
      ttRenderMs: 200,
      available: true,
      isInit: false,
      isRaw,
    }
  } // achieve

  const set = async (params) => {
    let result

    try {
      result = _utils.set.call(void 0, url, cachePath, params)
    } catch (err) {
      _ConsoleHandler2.default.error(err)
    }

    return result
  } // set

  const renew = async () => {
    let result

    try {
      result = await _utils.renew.call(void 0, url, cachePath)
    } catch (err) {
      _ConsoleHandler2.default.error(err)
    }

    return result
  } // renew

  const remove = async (options) => {
    options = {
      force: false,
      ...options,
    }

    if (!options.force) {
      const tmpCacheInfo = await achieve()

      if (tmpCacheInfo) return
    }

    try {
      await _utils.remove.call(void 0, url, cachePath)
    } catch (err) {
      _ConsoleHandler2.default.error(err)
    }
  } // remove

  const rename = async (params) => {
    try {
      await _utils.rename.call(void 0, url, cachePath, params || {})
    } catch (err) {
      _ConsoleHandler2.default.error(err)
    }
  } // rename

  const getStatus = () => {
    return _utils.getStatus.call(void 0, url, cachePath)
  } // getStatus

  const isExist = () => {
    return _utils.isExist.call(void 0, url, cachePath)
  } // isExist

  return {
    achieve,
    get,
    getStatus,
    set,
    renew,
    remove,
    rename,
    isExist,
  }
}

exports. default = CacheManager
