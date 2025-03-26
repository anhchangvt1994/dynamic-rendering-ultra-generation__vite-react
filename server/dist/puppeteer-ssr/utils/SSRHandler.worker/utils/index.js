'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj }
}
var _path = require('path')
var _path2 = _interopRequireDefault(_path)
var _constants = require('../../../../constants')
var _WorkerManager = require('../../../../utils/WorkerManager')
var _WorkerManager2 = _interopRequireDefault(_WorkerManager)
var _ConsoleHandler = require('../../../../utils/ConsoleHandler')
var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler)

const workerManager = _WorkerManager2.default.init(
  _path2.default.resolve(__dirname, `./worker.${_constants.resourceExtension}`),
  {
    minWorkers: 1,
    maxWorkers: 2,
  },
  ['getInternalScript', 'getInternalHTML']
)

const getInternalScriptWorker = async (params) => {
  if (!params) {
    _ConsoleHandler2.default.error('Need provide `params`!')
    return
  }

  if (!params.url) {
    _ConsoleHandler2.default.error('Need provide `params.url`!')
    return
  }

  const freePool = await workerManager.getFreePool()

  let result
  const pool = freePool.pool

  try {
    result = await pool.exec('getInternalScript', [params])
  } catch (err) {
    _ConsoleHandler2.default.error(err)
    result = {
      body: 'File not found!',
      status: 404,
    }
  }

  freePool.terminate({
    force: true,
    // delay: 30000,
  })

  return result
}
exports.getInternalScriptWorker = getInternalScriptWorker // getInternalScript

const getInternalHTMLWorker = async (params) => {
  if (!params) {
    _ConsoleHandler2.default.error('Need provide `params`!')
    return
  }

  if (!params.url) {
    _ConsoleHandler2.default.error('Need provide `params.url`!')
    return
  }

  const freePool = await workerManager.getFreePool()

  let result
  const pool = freePool.pool

  try {
    result = await pool.exec('getInternalHTML', [params])
  } catch (err) {
    _ConsoleHandler2.default.error(err)
    result = {
      body: 'File not found!',
      status: 404,
    }
  }

  freePool.terminate({
    force: true,
    // delay: 30000,
  })

  return result
}
exports.getInternalHTMLWorker = getInternalHTMLWorker // getInternalHTML
