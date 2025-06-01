"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _path = require('path'); var _path2 = _interopRequireDefault(_path);
var _constants = require('../../../constants');
var _ConsoleHandler = require('../../../utils/ConsoleHandler'); var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler);
var _WorkerManager = require('../../../utils/WorkerManager'); var _WorkerManager2 = _interopRequireDefault(_WorkerManager);

const workerManager = _WorkerManager2.default.init(
  _path2.default.resolve(__dirname, `./worker.${_constants.resourceExtension}`),
  {
    minWorkers: 1,
    maxWorkers: 3,
  },
  ['fetchData', 'refreshData']
)

 const fetchData = async (
  input,
  init





) => {
  if (!input) {
    _ConsoleHandler2.default.error('input is required!')
    return { status: 500, data: {}, message: 'input is required' }
  }

  const freePool = await workerManager.getFreePool()
  const pool = freePool.pool
  let result

  try {
    result = await pool.exec('fetchData', [input, init])
  } catch (err) {
    _ConsoleHandler2.default.error(err)
    result = { status: 500, data: {}, message: 'input is required' }
  }

  freePool.terminate({
    force: true,
  })

  return result
}; exports.fetchData = fetchData // fetchData

 const refreshData = async (cacheKeyList) => {
  if (!cacheKeyList || !cacheKeyList.length) {
    _ConsoleHandler2.default.error('cacheKeyList is required!')
    return
  }

  const freePool = await workerManager.getFreePool()
  const pool = freePool.pool
  let result

  try {
    await pool.exec('refreshData', [cacheKeyList])
    result = 'finish'
  } catch (err) {
    _ConsoleHandler2.default.error(err)
  }

  freePool.terminate({
    force: true,
  })

  return result
}; exports.refreshData = refreshData // refreshData
