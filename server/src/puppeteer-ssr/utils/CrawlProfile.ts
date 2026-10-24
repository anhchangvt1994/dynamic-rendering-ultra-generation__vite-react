import fs from 'fs'
import os from 'os'
import ServerConfig from '../../server.config'
import { PROCESS_ENV } from '../../utils/InitEnv'
import { BROWSER_ENGINE } from '../constants'

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
export type TCrawlProfile = 'default' | 'fast'

export const CRAWL_PROFILE: TCrawlProfile = (() => {
  const profile = String(PROCESS_ENV.CRAWL_PROFILE || '').toLowerCase()
  if (profile === 'fast' || profile === 'default') return profile

  return BROWSER_ENGINE === 'lightpanda' ? 'fast' : 'default'
})()

export const IS_FAST_CRAWL = CRAWL_PROFILE === 'fast'

const CGROUP_PATH = '/sys/fs/cgroup'

const _readCgroupFile = (file: string) => {
  try {
    return fs.readFileSync(`${CGROUP_PATH}/${file}`, 'utf8').trim()
  } catch {
    return ''
  }
} // _readCgroupFile

// NOTE - CPUs available to this server (cgroup quota in a container)
export const getCpuCount = () => {
  const [quota, period] = _readCgroupFile('cpu.max').split(' ')
  if (quota && quota !== 'max' && Number(period))
    return Math.max(1, Math.floor(Number(quota) / Number(period)))

  return os.availableParallelism?.() ?? os.cpus().length
} // getCpuCount

// NOTE - Available memory in MB (cgroup limit in a container)
export const getAvailableMemoryMB = () => {
  const max = _readCgroupFile('memory.max')
  if (max && max !== 'max') {
    const current = Number(_readCgroupFile('memory.current'))
    const inactiveFile = Number(
      /^inactive_file (\d+)$/m.exec(_readCgroupFile('memory.stat'))?.[1] ?? 0
    )
    return (Number(max) - (current - inactiveFile)) / 1048576
  }

  // NOTE - On macOS (development) freemem does not count the reclaimable
  // cache, so it is always low: do not limit by memory there
  if (process.platform === 'darwin') return Infinity

  // NOTE - Linux: MemAvailable
  return os.freemem() / 1048576
} // getAvailableMemoryMB

// NOTE - Fast profile: maximum renders at the same time (from new requests
// and from the waiting list together)
// NOTE - CPUs x 2: a render is mostly CPU, more parallel renders only made
// each one slower (2 vCPU: 6 at once -> all ready in ~4s, 4 at once -> ~2.5s)
export const FAST_CONCURRENCY =
  Number(PROCESS_ENV.CRAWL_CONCURRENCY) ||
  Math.min(12, Math.max(2, getCpuCount() * 2))

// NOTE - Crawls started from new requests
export const CRAWL_LIMIT = IS_FAST_CRAWL
  ? FAST_CONCURRENCY
  : ServerConfig.crawl.limit

// NOTE - Crawls started from the waiting list
export const CRAWL_WAITING_LIMIT = IS_FAST_CRAWL
  ? FAST_CONCURRENCY
  : ServerConfig.crawl.limit === 4
    ? 2
    : 1

// NOTE - Render workers (threads) of the ISR handler
export const CRAWL_WORKERS = IS_FAST_CRAWL ? FAST_CONCURRENCY : 2

export const FAST_CRAWL_OPTIONS = {
  minAvailableMemoryMB: Number(PROCESS_ENV.CRAWL_MIN_FREE_MEMORY_MB) || 400,
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

// NOTE - Whether a new crawl can start now (always true for default). In the
// fast profile at most FAST_CONCURRENCY crawls run (one per render worker, so
// none waits in the worker queue while its timeout runs) and one crawl can
// always run, so the queue keeps moving when memory is low
export const hasCrawlCapacity = (runningCrawls: number) =>
  !IS_FAST_CRAWL ||
  runningCrawls <= 0 ||
  (runningCrawls < FAST_CONCURRENCY &&
    getAvailableMemoryMB() >= FAST_CRAWL_OPTIONS.minAvailableMemoryMB)
