"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var _fs = require('fs'); var _fs2 = _interopRequireDefault(_fs);
var _os = require('os'); var _os2 = _interopRequireDefault(_os);
var _serverconfig = require('../../server.config'); var _serverconfig2 = _interopRequireDefault(_serverconfig);
var _InitEnv = require('../../utils/InitEnv');
var _constants = require('../constants');

/**
 * NOTE - Crawl profile of the ISR queue
 * - default: the original throttle, made for chromium (limit 2-4 crawls,
 *   2 render workers, a start delay per queued crawl)
 * - fast: for lightpanda, where a render costs a few MB and ~0.1 CPU second.
 *   More crawls in parallel (based on the CPUs), render workers kept ready, no
 *   start delay. A new crawl only starts while enough memory is available.
 * Default: fast when BROWSER_ENGINE=lightpanda, override with CRAWL_PROFILE.
 * How a render waits for its page does not depend on the profile, see
 * CRAWL_WAIT below.
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
// NOTE - CPUs x 2: a render is mostly CPU, more parallel renders only made
// each one slower (2 vCPU: 6 at once -> all ready in ~4s, 4 at once -> ~2.5s)
 const FAST_CONCURRENCY =
  Number(_InitEnv.PROCESS_ENV.CRAWL_CONCURRENCY) ||
  Math.min(12, Math.max(2, exports.getCpuCount.call(void 0, ) * 2)); exports.FAST_CONCURRENCY = FAST_CONCURRENCY

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
  minAvailableMemoryMB: Number(_InitEnv.PROCESS_ENV.CRAWL_MIN_FREE_MEMORY_MB) || 400,
}; exports.FAST_CRAWL_OPTIONS = FAST_CRAWL_OPTIONS

// NOTE - How a render waits for its page, for both engines (CRAWL_WAIT):
// - network-idle (default): done when no request has been pending for
//   networkIdleMs (max maxWaitMs)
// - fixed: the original fixed waits after the page loaded (~3-4s more)
 const IS_NETWORK_IDLE_WAIT =
  String(_InitEnv.PROCESS_ENV.CRAWL_WAIT || '').toLowerCase() !== 'fixed'; exports.IS_NETWORK_IDLE_WAIT = IS_NETWORK_IDLE_WAIT

 const CRAWL_WAIT_OPTIONS = {
  networkIdleMs: Number(_InitEnv.PROCESS_ENV.CRAWL_NETWORK_IDLE_MS) || 500,
  // NOTE - Extra wait for a page that has no <title> yet when the network is
  // idle (not rendered yet)
  titleWaitMs: 5000,
  // NOTE - A request pending longer than this (ex: a down API) does not hold
  // the page anymore
  requestTimeoutMs: Number(_InitEnv.PROCESS_ENV.CRAWL_REQUEST_TIMEOUT_MS) || 3000,
  maxWaitMs: 15000,
  // NOTE - A request of a page that is not cached yet waits this long for the
  // render before answering 503 (the bot gets the page on its first visit
  // instead of coming back later), 0 to disable
  firstResponseWaitMs: Number(_nullishCoalesce(_InitEnv.PROCESS_ENV.CRAWL_FIRST_RESPONSE_WAIT_MS, () => ( 5000))),
}; exports.CRAWL_WAIT_OPTIONS = CRAWL_WAIT_OPTIONS

// NOTE - Whether a new crawl can start now (always true for default). In the
// fast profile at most FAST_CONCURRENCY crawls run (one per render worker, so
// none waits in the worker queue while its timeout runs) and one crawl can
// always run, so the queue keeps moving when memory is low
 const hasCrawlCapacity = (runningCrawls) =>
  !exports.IS_FAST_CRAWL ||
  runningCrawls <= 0 ||
  (runningCrawls < exports.FAST_CONCURRENCY &&
    exports.getAvailableMemoryMB.call(void 0, ) >= exports.FAST_CRAWL_OPTIONS.minAvailableMemoryMB); exports.hasCrawlCapacity = hasCrawlCapacity
