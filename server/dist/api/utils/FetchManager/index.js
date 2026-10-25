"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var _path = require('path'); var _path2 = _interopRequireDefault(_path);
var _constants = require('../../../constants');
var _ConsoleHandler = require('../../../utils/ConsoleHandler'); var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler);
var _WorkerManager = require('../../../utils/WorkerManager'); var _WorkerManager2 = _interopRequireDefault(_WorkerManager);
var _utils = require('./utils');

const workerManager = _WorkerManager2.default.init(
  _path2.default.resolve(__dirname, `./worker.${_constants.resourceExtension}`),
  {
    minWorkers: 1,
    maxWorkers: 3,
  },
  ['fetchData', 'refreshData']
)

// NOTE - Identical GET requests to the upstream API running at the same time
// share one fetch
const inflightFetches = new Map()

 const fetchData = async (
  input,
  init






) => {
  if (!input) {
    _ConsoleHandler2.default.error('input is required!')
    return {
      status: 500,
      data: {},
      compressData: {},
      message: 'input is required',
    }
  }

  // NOTE - fetch is async I/O: it runs in this thread. In the worker pool, the
  // response (up to hundreds of KB) was copied between threads twice
  const method = (_optionalChain([init, 'optionalAccess', _ => _.method]) || 'GET').toUpperCase()
  if (method !== 'GET' || _optionalChain([init, 'optionalAccess', _2 => _2.body])) return _utils.fetchData.call(void 0, input, init)

  const key = String(input)
  const inflightFetch = inflightFetches.get(key)
  if (inflightFetch) return inflightFetch

  const newFetch = _utils.fetchData.call(void 0, input, init).finally(() =>
    inflightFetches.delete(key)
  )
  inflightFetches.set(key, newFetch)

  return newFetch
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
