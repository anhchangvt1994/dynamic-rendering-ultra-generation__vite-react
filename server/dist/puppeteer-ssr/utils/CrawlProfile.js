"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var _fs = require('fs'); var _fs2 = _interopRequireDefault(_fs);
var _os = require('os'); var _os2 = _interopRequireDefault(_os);
var _serverconfig = require('../../server.config'); var _serverconfig2 = _interopRequireDefault(_serverconfig);
var _InitEnv = require('../../utils/InitEnv');
var _constants = require('../constants');

/**
 * NOTE - Crawl profile of the ISR queue
 * - default: the original throttle, made for chromium (limit 2-4 crawls,
 *   2 render workers, fixed waits after the page loaded)
 * - fast: for lightpanda, where a render costs a few MB and ~0.1 CPU second.
 *   More crawls in parallel (based on the CPUs), no start delay, and a page is
 *   done when the network is really idle instead of after fixed waits. A new
 *   crawl only starts while enough memory is available.
 * Default: fast when BROWSER_ENGINE=lightpanda, override with CRAWL_PROFILE.
 */


 const CRAWL_PROFILE = (() => {
  const profile = String(_InitEnv.PROCESS_ENV.CRAWL_PROFILE || '').toLowerCase()
  if (profile === 'fast' || profile === 'default') return profile

  return _constants.BROWSER_ENGINE === 'lightpanda' ? 'fast' : 'default'
})(); exports.CRAWL_PROFILE = CRAWL_PROFILE

 const IS_FAST_CRAWL = exports.CRAWL_PROFILE === 'fast'; exports.IS_FAST_CRAWL = IS_FAST_CRAWL

const CGROUP_PATH = '/sys/fs/cgroup'

const _readCgroupFile = (file) => {
  try {
    return _fs2.default.readFileSync(`${CGROUP_PATH}/${file}`, 'utf8').trim()
  } catch (e) {
    return ''
  }
} // _readCgroupFile

// NOTE - CPUs available to this server (cgroup quota in a container)
 const getCpuCount = () => {
  const [quota, period] = _readCgroupFile('cpu.max').split(' ')
  if (quota && quota !== 'max' && Number(period))
    return Math.max(1, Math.floor(Number(quota) / Number(period)))

  return _nullishCoalesce(_optionalChain([_os2.default, 'access', _ => _.availableParallelism, 'optionalCall', _2 => _2()]), () => ( _os2.default.cpus().length))
}; exports.getCpuCount = getCpuCount // getCpuCount

// NOTE - Available memory in MB (cgroup limit in a container)
 const getAvailableMemoryMB = () => {
  const max = _readCgroupFile('memory.max')
  if (max && max !== 'max') {
    const current = Number(_readCgroupFile('memory.current'))
    const inactiveFile = Number(
      _nullishCoalesce(_optionalChain([/^inactive_file (\d+)$/m, 'access', _3 => _3.exec, 'call', _4 => _4(_readCgroupFile('memory.stat')), 'optionalAccess', _5 => _5[1]]), () => ( 0))
    )
    return (Number(max) - (current - inactiveFile)) / 1048576
  }

  // NOTE - On macOS (development) freemem does not count the reclaimable
  // cache, so it is always low: do not limit by memory there
  if (process.platform === 'darwin') return Infinity

  // NOTE - Linux: MemAvailable
  return _os2.default.freemem() / 1048576
}; exports.getAvailableMemoryMB = getAvailableMemoryMB // getAvailableMemoryMB

// NOTE - Fast profile: maximum renders at the same time (from new requests
// and from the waiting list together)
 const FAST_CONCURRENCY =
  Number(_InitEnv.PROCESS_ENV.CRAWL_CONCURRENCY) ||
  Math.min(12, Math.max(2, exports.getCpuCount.call(void 0, ) * 3)); exports.FAST_CONCURRENCY = FAST_CONCURRENCY

// NOTE - Crawls started from new requests
 const CRAWL_LIMIT = exports.IS_FAST_CRAWL
  ? exports.FAST_CONCURRENCY
  : _serverconfig2.default.crawl.limit; exports.CRAWL_LIMIT = CRAWL_LIMIT

// NOTE - Crawls started from the waiting list
 const CRAWL_WAITING_LIMIT = exports.IS_FAST_CRAWL
  ? exports.FAST_CONCURRENCY
  : _serverconfig2.default.crawl.limit === 4
    ? 2
    : 1; exports.CRAWL_WAITING_LIMIT = CRAWL_WAITING_LIMIT

// NOTE - Render workers (threads) of the ISR handler
 const CRAWL_WORKERS = exports.IS_FAST_CRAWL ? exports.FAST_CONCURRENCY : 2; exports.CRAWL_WORKERS = CRAWL_WORKERS

 const FAST_CRAWL_OPTIONS = {
  // NOTE - The page is done when no request is pending for this duration
  networkIdleMs: 500,
  maxWaitMs: 15000,
  minAvailableMemoryMB: Number(_InitEnv.PROCESS_ENV.CRAWL_MIN_FREE_MEMORY_MB) || 400,
}; exports.FAST_CRAWL_OPTIONS = FAST_CRAWL_OPTIONS

// NOTE - Whether a new crawl can start now (always true for default). In the
// fast profile at most FAST_CONCURRENCY crawls run (one per render worker, so
// none waits in the worker queue while its timeout runs) and one crawl can
// always run, so the queue keeps moving when memory is low
 const hasCrawlCapacity = (runningCrawls) =>
  !exports.IS_FAST_CRAWL ||
  runningCrawls <= 0 ||
  (runningCrawls < exports.FAST_CONCURRENCY &&
    exports.getAvailableMemoryMB.call(void 0, ) >= exports.FAST_CRAWL_OPTIONS.minAvailableMemoryMB); exports.hasCrawlCapacity = hasCrawlCapacity
