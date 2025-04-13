'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj }
}
var _fs = require('fs')
var _fs2 = _interopRequireDefault(_fs)
var _path = require('path')
var _path2 = _interopRequireDefault(_path)
var _constants = require('../../../constants')
var _ConsoleHandler = require('../../../utils/ConsoleHandler')
var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler)
var _WorkerManager = require('../../../utils/WorkerManager')
var _WorkerManager2 = _interopRequireDefault(_WorkerManager)

var _utils = require('../Cache.worker/utils')

const workerManager = _WorkerManager2.default.init(
  _path2.default.resolve(
    __dirname,
    `./../Cache.worker/index.${_constants.resourceExtension}`
  ),
  {
    minWorkers: 1,
    maxWorkers: 3,
  },
  ['get', 'set', 'renew', 'remove', 'rename']
)

const CacheManager = (url, cachePath) => {
  const get = async () => {
    const freePool = await workerManager.getFreePool()
    const pool = freePool.pool
    let result

    try {
      result = await pool.exec('get', [url, cachePath])
    } catch (err) {
      _ConsoleHandler2.default.error(err)
    }

    freePool.terminate({
      force: true,
    })

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
    const freePool = await workerManager.getFreePool()
    const pool = freePool.pool
    let result

    try {
      result = await pool.exec('set', [url, cachePath, params])
    } catch (err) {
      _ConsoleHandler2.default.error(err)
    }

    freePool.terminate({
      force: true,
    })

    return result
  } // set

  const renew = async () => {
    const freePool = await workerManager.getFreePool()
    const pool = freePool.pool
    let result

    try {
      result = await pool.exec('renew', [url, cachePath])
    } catch (err) {
      _ConsoleHandler2.default.error(err)
    }

    freePool.terminate({
      force: true,
    })

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

    const freePool = await workerManager.getFreePool()
    const pool = freePool.pool

    try {
      await pool.exec('remove', [url, cachePath])
    } catch (err) {
      _ConsoleHandler2.default.error(err)
    }

    freePool.terminate({
      force: true,
    })
  } // remove

  const rename = async (params) => {
    if (!url) return

    const freePool = await workerManager.getFreePool()
    const pool = freePool.pool

    try {
      await pool.exec('rename', [url, cachePath, params || {}])
    } catch (err) {
      _ConsoleHandler2.default.error(err)
    }

    freePool.terminate({
      force: true,
    })
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

exports.default = CacheManager
