import { workerData } from 'worker_threads'
import {
  getAvailableMemoryMB,
  getResourceBudget,
  getResources,
} from '../../utils/ResourceBudget'
import { createRenderGate } from '../../utils/RenderGate'
import { PROCESS_ENV } from '../../utils/InitEnv'
import { BROWSER_ENGINE } from '../constants'

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
export type TCrawlProfile = 'default' | 'fast'

export const CRAWL_PROFILE: TCrawlProfile = (() => {
  const profile = String(PROCESS_ENV.CRAWL_PROFILE || '').toLowerCase()
  if (profile === 'fast' || profile === 'default') return profile

  return BROWSER_ENGINE === 'lightpanda' ? 'fast' : 'default'
})()

export const IS_FAST_CRAWL = CRAWL_PROFILE === 'fast'

export const RESOURCE_BUDGET = getResourceBudget(PROCESS_ENV)
export const getCpuCount = () => getResources().cpuCount
export { getAvailableMemoryMB }

// CRAWL_CONCURRENCY is the VPS-wide budget. PM2 divides it among instances;
// all request workers in an instance share its atomic render permits.
export const FAST_CONCURRENCY = RESOURCE_BUDGET.renderConcurrency
export const CRAWL_LIMIT = FAST_CONCURRENCY
export const CRAWL_WAITING_LIMIT = FAST_CONCURRENCY
export const CRAWL_WORKERS = FAST_CONCURRENCY
export const crawlGate = createRenderGate({
  limit: FAST_CONCURRENCY,
  queueLimit: RESOURCE_BUDGET.queueLimit,
  waitTimeoutMs: RESOURCE_BUDGET.queueTimeoutMs,
  sharedState: workerData?.renderSlots,
  canStart: () =>
    getAvailableMemoryMB() >= FAST_CRAWL_OPTIONS.minAvailableMemoryMB,
})
export const FAST_CRAWL_OPTIONS = {
  minAvailableMemoryMB:
    Number(PROCESS_ENV.CRAWL_MIN_FREE_MEMORY_MB) ||
    Math.max(128, Math.min(512, RESOURCE_BUDGET.memoryMB * 0.1)),
}

// NOTE - How a render waits for its page, for both engines (CRAWL_WAIT):
// - network-idle (default): done when no request has been pending for
//   networkIdleMs (max maxWaitMs)
// - fixed: the original fixed waits after the page loaded (~3-4s more)
export const IS_NETWORK_IDLE_WAIT =
  String(PROCESS_ENV.CRAWL_WAIT || '').toLowerCase() !== 'fixed'

export const CRAWL_WAIT_OPTIONS = {
  networkIdleMs: Number(PROCESS_ENV.CRAWL_NETWORK_IDLE_MS) || 500,
  // NOTE - Extra wait for a page that has no <title> yet when the network is
  // idle (not rendered yet)
  titleWaitMs: 5000,
  // NOTE - A request pending longer than this (ex: a down API) does not hold
  // the page anymore
  requestTimeoutMs: Number(PROCESS_ENV.CRAWL_REQUEST_TIMEOUT_MS) || 3000,
  maxWaitMs: 15000,
  // NOTE - A request of a page that is not cached yet waits this long for the
  // render before answering 503 (the bot gets the page on its first visit
  // instead of coming back later), 0 to disable
  firstResponseWaitMs: Number(PROCESS_ENV.CRAWL_FIRST_RESPONSE_WAIT_MS ?? 5000),
}

// Memory pressure delays new heavy work; HTTP/API requests continue normally.
export const hasCrawlCapacity = (runningCrawls: number) =>
  runningCrawls < CRAWL_LIMIT &&
  crawlGate.hasCapacity() &&
  getAvailableMemoryMB() >= FAST_CRAWL_OPTIONS.minAvailableMemoryMB
