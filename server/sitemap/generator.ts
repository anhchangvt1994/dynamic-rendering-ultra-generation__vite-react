import { normalizeCrawlUrl } from './config'
import type { CrawlResult } from './crawl-page'

export const crawlSite = async (options: {
  host: string
  crawlOrigin?: string
  concurrency: number
  maxPages: number
  retries: number
  seeds?: string[]
  signal?: AbortSignal
  crawl: (url: string, lane: number) => Promise<CrawlResult>
  onPage: (url: string) => void | Promise<void>
  onProgress?: (stats: {
    visited: number
    saved: number
    queued: number
  }) => void
}) => {
  const {
    host,
    concurrency,
    maxPages,
    retries,
    crawl,
    onPage,
    onProgress,
    signal,
  } = options
  const queue: string[] = []
  const queued = new Set<string>()
  const saved = new Set<string>()
  const failures: string[] = []
  let next = 0,
    visited = 0,
    skipped = 0,
    retryCount = 0
  let fatal: Error | undefined
  const enqueue = (href: string, base: string) => {
    const url = normalizeCrawlUrl(href, base, host, options.crawlOrigin)
    if (!url || queued.has(url)) return
    if (queued.size >= maxPages)
      throw new Error(
        `Sitemap maxPages (${maxPages}) exceeded; increase --max-pages after reviewing the URLs`
      )
    queued.add(url)
    queue.push(url)
  }
  enqueue(host, host)
  for (const seed of options.seeds || []) enqueue(seed, host + '/')
  const visit = async (url: string, lane: number) => {
    let result: CrawlResult | undefined
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        result = undefined
        result = await crawl(url, lane)
        if (result.status < 500 && result.status !== 429) break
        throw new Error(`HTTP ${result.status}`)
      } catch (error) {
        if (attempt === retries) {
          failures.push(`${url}: ${error.message}`)
          return
        }
        signal?.throwIfAborted()
        retryCount++
        const retryAfterMs = Math.min(60000, result?.retryAfterMs || 0)
        const retryDelayMs = Math.max(200 * (attempt + 1), retryAfterMs)
        await new Promise<void>((resolve, reject) => {
          const finish = () => {
            signal?.removeEventListener('abort', abort)
            resolve()
          }
          const abort = () => {
            clearTimeout(timeout)
            signal?.removeEventListener('abort', abort)
            reject(signal?.reason || new Error('Sitemap generation cancelled'))
          }
          const timeout = setTimeout(finish, retryDelayMs)
          signal?.addEventListener('abort', abort, { once: true })
          if (signal?.aborted) abort()
        })
      }
    }
    signal?.throwIfAborted()
    visited++
    if (!result || result.status < 200 || result.status >= 300) {
      if (url === normalizeCrawlUrl(host, host, host))
        throw new Error(`Homepage returned HTTP ${result?.status}`)
      skipped++
      return
    }
    const finalUrl = normalizeCrawlUrl(result.url || url, url, host)
    if (!finalUrl) {
      skipped++
      return
    }
    if (result.noindex) skipped++
    else if (!saved.has(finalUrl)) {
      saved.add(finalUrl)
      await onPage(finalUrl)
    }
    for (const href of result.data) enqueue(href, finalUrl)
    onProgress?.({ visited, saved: saved.size, queued: queue.length })
  }
  const active = new Map<number, Promise<void>>()
  while ((!fatal && next < queue.length) || active.size) {
    if (signal?.aborted) fatal ||= new Error('Sitemap generation cancelled')
    for (
      let lane = 0;
      !fatal && lane < concurrency && next < queue.length;
      lane++
    ) {
      if (active.has(lane)) continue
      const task = visit(queue[next++], lane)
        .catch((error) => {
          fatal ||= error
        })
        .finally(() => {
          active.delete(lane)
        })
      active.set(lane, task)
    }
    if (active.size) await Promise.race(active.values())
  }
  signal?.throwIfAborted()
  if (fatal) throw fatal
  if (failures.length)
    throw new Error(
      `Sitemap crawl failed (${failures.length} URLs); published files kept intact:\n${failures.slice(0, 10).join('\n')}`
    )
  if (!saved.size)
    throw new Error('No indexable pages found; published files kept intact')
  return {
    visited,
    saved: saved.size,
    skipped,
    retries: retryCount,
    discovered: queued.size,
  }
}
