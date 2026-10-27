"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var _worker_threads = require('worker_threads');




var _ResourceBudget = require('../../utils/ResourceBudget');
var _RenderGate = require('../../utils/RenderGate');
var _InitEnv = require('../../utils/InitEnv');
var _constants = require('../constants');

/**
 * NOTE - Crawl profile of the ISR queue
 * - default: the original throttle, made for chromium (limit 2-4 crawls,
 *   2 render workers, a start delay per queued crawl)
 * - fast: no stagger delay for lightpanda. Both profiles use the same
 *   CPU/RAM budget and shared rendering permits; a fast engine does not
 *   justify multiplying eager pools across PM2 and request workers.
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

 const RESOURCE_BUDGET = _ResourceBudget.getResourceBudget.call(void 0, _InitEnv.PROCESS_ENV); exports.RESOURCE_BUDGET = RESOURCE_BUDGET
 const getCpuCount = () => _ResourceBudget.getResources.call(void 0, ).cpuCount; exports.getCpuCount = getCpuCount
exports.getAvailableMemoryMB = _ResourceBudget.getAvailableMemoryMB;

// CRAWL_CONCURRENCY is the VPS-wide budget. PM2 divides it among instances;
// all request workers in an instance share its atomic render permits.
 const FAST_CONCURRENCY = exports.RESOURCE_BUDGET.renderConcurrency; exports.FAST_CONCURRENCY = FAST_CONCURRENCY
 const CRAWL_LIMIT = exports.FAST_CONCURRENCY; exports.CRAWL_LIMIT = CRAWL_LIMIT
 const CRAWL_WAITING_LIMIT = exports.FAST_CONCURRENCY; exports.CRAWL_WAITING_LIMIT = CRAWL_WAITING_LIMIT
 const CRAWL_WORKERS = exports.FAST_CONCURRENCY; exports.CRAWL_WORKERS = CRAWL_WORKERS
 const crawlGate = _RenderGate.createRenderGate.call(void 0, {
  limit: exports.FAST_CONCURRENCY,
  queueLimit: exports.RESOURCE_BUDGET.queueLimit,
  waitTimeoutMs: exports.RESOURCE_BUDGET.queueTimeoutMs,
  sharedState: _optionalChain([_worker_threads.workerData, 'optionalAccess', _ => _.renderSlots]),
  canStart: () =>
    _ResourceBudget.getAvailableMemoryMB.call(void 0, ) >= exports.FAST_CRAWL_OPTIONS.minAvailableMemoryMB,
}); exports.crawlGate = crawlGate
 const FAST_CRAWL_OPTIONS = {
  minAvailableMemoryMB:
    Number(_InitEnv.PROCESS_ENV.CRAWL_MIN_FREE_MEMORY_MB) ||
    Math.max(128, Math.min(512, exports.RESOURCE_BUDGET.memoryMB * 0.1)),
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

// Memory pressure delays new heavy work; HTTP/API requests continue normally.
 const hasCrawlCapacity = (runningCrawls) =>
  runningCrawls < exports.CRAWL_LIMIT &&
  exports.crawlGate.hasCapacity() &&
  _ResourceBudget.getAvailableMemoryMB.call(void 0, ) >= exports.FAST_CRAWL_OPTIONS.minAvailableMemoryMB; exports.hasCrawlCapacity = hasCrawlCapacity
