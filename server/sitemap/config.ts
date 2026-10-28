import path from 'node:path'
import { getResources } from '../src/utils/ResourceBudget'

export const normalizeCrawlUrl = (
  href: string,
  base: string,
  host: string,
  crawlOrigin = host
) => {
  if (!href?.trim()) return
  try {
    const url = new URL(href, base)
    const canonical = new URL(host)
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      (url.origin !== canonical.origin &&
        url.origin !== new URL(crawlOrigin).origin) ||
      url.username ||
      url.password ||
      /\.(?:xml|json|js|css|map|png|jpe?g|gif|svg|webp|avif|ico|pdf|zip|mp[34]|woff2?|ttf)$/i.test(
        url.pathname
      )
    )
      return
    url.protocol = canonical.protocol
    url.hostname = canonical.hostname
    url.port = canonical.port
    url.hash = ''
    url.pathname = url.pathname.replace(/\/+$/, '') || '/'
    return url.href
  } catch {
    return
  }
}

const integer = (
  env: Record<string, unknown>,
  key: string,
  fallback: number,
  min = 1,
  max = Number.MAX_SAFE_INTEGER
) => {
  if (env[key] === undefined || env[key] === '') return fallback
  const value = Number(env[key])
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${key} must be an integer between ${min} and ${max}`)
  }
  return value
}

const httpOrigin = (value: unknown, name: string) => {
  try {
    const url = new URL(String(value || ''))
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    )
      throw new Error()
    return url.origin
  } catch {
    throw new Error(
      `${name} must be an HTTP(S) origin, e.g. https://example.com`
    )
  }
}

export const getCrawlUrl = (url: string, crawlOrigin: string) => {
  const parsed = new URL(url)
  return crawlOrigin + parsed.pathname + parsed.search
}

export const getSitemapOptions = (
  env: Record<string, unknown>,
  resources = getResources()
) => {
  const host = httpOrigin(env.HOST, 'HOST')
  const crawlOrigin = httpOrigin(
    env.SITEMAP_CRAWL_ORIGIN || host,
    'SITEMAP_CRAWL_ORIGIN'
  )
  const memoryCapacity = Math.max(
    1,
    Math.floor((resources.memoryMB * 0.5 - 256) / 384)
  )
  const concurrency = Math.min(
    integer(
      env,
      'SITEMAP_CONCURRENCY',
      Math.min(8, resources.cpuCount * 2),
      1,
      32
    ),
    memoryCapacity,
    resources.cpuCount * 2,
    16
  )
  const renderConcurrency = Math.min(
    concurrency,
    memoryCapacity,
    resources.cpuCount,
    integer(env, 'SITEMAP_RENDER_CONCURRENCY', 2, 1, 8)
  )
  const mode = String(env.SITEMAP_MODE || 'auto')
  if (!['auto', 'render'].includes(mode))
    throw new Error('SITEMAP_MODE must be auto or render')
  const outputDir = path.resolve(String(env.SITEMAP_OUTPUT_DIR || __dirname))
  return {
    seedSitemap: String(
      env.SITEMAP_SEED_SITEMAP || path.join(outputDir, 'sitemap.xml')
    ),
    reuseExisting: !['false', '0'].includes(
      String(env.SITEMAP_REUSE_EXISTING).toLowerCase()
    ),
    mode,
    renderConcurrency,
    maxResponseBytes:
      integer(env, 'SITEMAP_MAX_RESPONSE_MB', 8, 1, 64) * 1048576,
    host,
    crawlOrigin,
    concurrency,
    outputDir,
    maxPages: integer(env, 'SITEMAP_MAX_PAGES', 20000, 1, 500000),
    timeoutMs: integer(env, 'SITEMAP_TIMEOUT_MS', 30000, 100, 300000),
    idleMs: integer(env, 'SITEMAP_IDLE_MS', 300, 50, 10000),
    settleMs: integer(env, 'SITEMAP_SETTLE_MS', 100, 0, 30000),
    retries: integer(env, 'SITEMAP_RETRIES', 1, 0, 3),
    readySelector: String(env.SITEMAP_READY_SELECTOR || ''),
    engine: String(
      env.SITEMAP_BROWSER_ENGINE || env.BROWSER_ENGINE || 'chromium'
    ),
    wsEndpoint: String(env.SITEMAP_BROWSER_WS_ENDPOINT || ''),
    executablePath: String(env.SITEMAP_EXECUTABLE_PATH || ''),
  }
}
