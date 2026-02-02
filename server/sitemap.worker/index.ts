import { PROCESS_ENV } from '../src/utils/InitEnv'
import { crawlWorker, saveUrlToSitemap } from './utils'

// Use console.error for logging
const error = (...args: any[]) => console.error('[SITEMAP ERROR]', ...args)

const HOST = PROCESS_ENV.HOST
const visitedUrls = new Set()

// Normalize URL by removing trailing slashes
const normalizeUrl = (url: string): string => {
  if (!url) return ''
  return url.replace(/\/$/, '') || url
}

// Get today's date in ISO 8601 format (YYYY-MM-DD)
const getTodayDate = (): string => {
  return new Date().toISOString().split('T')[0]
}

// Determine changefreq based on URL path
const getChangeFreq = (url: string): 'daily' | 'weekly' | 'monthly' => {
  const path = url.replace(HOST, '')
  // Blog and index pages change more frequently
  if (
    path === '' ||
    path === '/blogs' ||
    path === '/blog' ||
    path === '/index'
  ) {
    return 'daily'
  }
  // Detail pages change less frequently
  return 'weekly'
}

// Determine priority based on URL path
const getPriority = (url: string): number => {
  const path = url.replace(HOST, '')
  // Homepage has highest priority
  if (path === '' || path === '/') {
    return 1.0
  }
  // Main pages (blogs, etc.)
  if (path === '/blogs' || path === '/blog' || path === '/index') {
    return 0.8
  }
  // Detail pages have lower priority
  return 0.6
}

// Use crawlWorker for URL crawling (uses worker pool with regex-based link extraction)
const crawlPage = async (url: string) => {
  if (!url) return { status: 500, data: [] }

  try {
    const result = await crawlWorker({ url })
    // crawlWorker returns { data: links } from worker
    // The worker returns { status, data: links }
    if (result && result.data) {
      return { status: 200, data: result.data }
    }
    return { status: 500, data: [] }
  } catch (err) {
    error('Failed to crawl page:', err.message)
    return { status: 500, data: [] }
  }
}

const generateSitemap = async (url: string) => {
  if (!url) {
    error('No URL provided')
    return
  }

  // Always normalize the URL for consistent handling
  const normalizedUrl = normalizeUrl(url)

  // Skip if already visited
  if (visitedUrls.has(normalizedUrl)) {
    return
  }

  // Mark as visited
  visitedUrls.add(normalizedUrl)

  // Get metadata for this URL
  const lastmod = getTodayDate()
  const changefreq = getChangeFreq(url)
  const priority = getPriority(url)

  saveUrlToSitemap(url, lastmod, changefreq, priority)

  const result = await crawlPage(url)
  const urlList = result.data || []

  if (urlList && urlList.length) {
    for (const link of urlList) {
      if (!link) continue
      const normalizedLink = normalizeUrl(link)
      // Skip if already visited
      if (visitedUrls.has(normalizedLink)) {
        continue
      }
      await generateSitemap(link)
    }
  }
}

generateSitemap(normalizeUrl(HOST))
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    error('Sitemap generation failed:', err)
    process.exit(1)
  })
