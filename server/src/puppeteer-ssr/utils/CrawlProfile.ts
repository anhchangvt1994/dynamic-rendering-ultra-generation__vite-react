import fs from 'fs'
import os from 'os'
import ServerConfig from '../../server.config'
import { PROCESS_ENV } from '../../utils/InitEnv'
import { BROWSER_ENGINE } from '../constants'

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
export const FAST_CONCURRENCY =
  Number(PROCESS_ENV.CRAWL_CONCURRENCY) ||
  Math.min(12, Math.max(2, getCpuCount() * 3))

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
  // NOTE - The page is done when no request is pending for this duration
  networkIdleMs: 500,
  maxWaitMs: 15000,
  minAvailableMemoryMB: Number(PROCESS_ENV.CRAWL_MIN_FREE_MEMORY_MB) || 400,
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
