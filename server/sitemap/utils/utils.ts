import fs from 'node:fs'
import path from 'path'
import {
  FREQ_DEFAULT,
  FREQ_PATH_LIST,
  SITEMAP_FILE,
  SITEMAP_FILE_RENEW,
  SITEMAPS_DIR,
  SITEMAPS_RENEW_DIR,
} from '../../sitemap/constants'
import Console from '../../src/utils/ConsoleHandler'
import { PROCESS_ENV } from '../../src/utils/InitEnv'
const { isMainThread } = require('worker_threads')

export const normalizeUrl = (url: string): string => {
  if (!url) return ''
  return url.replace(/\/$/, '') || url
} // normalizeUrl

// Get today's date in ISO 8601 format (YYYY-MM-DD)
export const getTodayDate = (): string => {
  return new Date().toISOString().split('T')[0]
} // getTodayDate

// Determine priority based on URL path
export const getPriority = (url: string): number => {
  const path = url.replace(PROCESS_ENV.HOST, '')
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
} // getPriority

// Determine changefreq based on URL path
export const getChangeFreq = (url: string): 'daily' | 'weekly' | 'monthly' => {
  const path = url.replace(PROCESS_ENV.HOST, '')

  let changeFreq = FREQ_DEFAULT

  for (const key in FREQ_PATH_LIST) {
    const checkFreqFactory = FREQ_PATH_LIST[key] as any

    if (
      (typeof checkFreqFactory === 'function' && checkFreqFactory(path)) ||
      (checkFreqFactory.length && checkFreqFactory.includes(path))
    ) {
      changeFreq = key
      break
    }
  }

  return changeFreq as any
} // getChangeFreq

export const saveUrlToSitemap = (params: {
  file: string
  loc: string
  lastmod?: string
  changefreq?:
    | 'always'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'yearly'
    | 'never'
  priority?: number
}): void => {
  const {
    file = '',
    loc = '',
    lastmod = '',
    changefreq = '',
    priority = 0,
  } = params

  if (!loc) {
    Console.error('Need provide `loc`')
    return
  }

  // Normalize URL by removing trailing slashes
  const normalizedUrl = normalizeUrl(loc)

  // Build optional XML elements
  let newUrl = `  <url>\n    <loc>${normalizedUrl}</loc>`

  if (lastmod) {
    newUrl += `\n    <lastmod>${lastmod}</lastmod>`
  }

  if (changefreq) {
    newUrl += `\n    <changefreq>${changefreq}</changefreq>`
  }

  if (priority !== undefined) {
    newUrl += `\n    <priority>${priority.toFixed(1)}</priority>`
  }

  newUrl += `\n  </url>\n`

  // Create file with header if not exists
  if (!fs.existsSync(file)) {
    fs.writeFileSync(
      file,
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>'
    )
  }

  // Read current content
  let content = fs.readFileSync(file, 'utf-8')

  // Check for duplicate (using normalized URL)
  if (content.includes(`<loc>${normalizedUrl}</loc>`)) {
    return
  }

  // Insert new URL before closing tag
  content = content.replace('</urlset>', `${newUrl}</urlset>`)

  // Write back
  fs.writeFileSync(file, content)
} // saveUrlToSitemap

export const generateSubSitemapPath = (() => {
  if (!isMainThread) return

  let sitemapsDir = SITEMAPS_DIR

  if (fs.existsSync(sitemapsDir)) {
    sitemapsDir = SITEMAPS_RENEW_DIR

    if (fs.existsSync(sitemapsDir)) {
      fs.rmSync(sitemapsDir, { recursive: true, force: true })
    }
  }

  return (name): string => {
    if (!name) return ''

    let filePath = path.join(sitemapsDir, name + '.xml')

    if (!fs.existsSync(path.dirname(filePath))) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true })
    }

    return filePath
  }
})() // generateSubSitemapPath

export const generateMainSitemapPath = (() => {
  if (!isMainThread) return

  let filePath = ''

  if (fs.existsSync(SITEMAP_FILE_RENEW)) {
    fs.unlinkSync(SITEMAP_FILE_RENEW)
  }

  return (): string => {
    if (!filePath) {
      if (fs.existsSync(SITEMAP_FILE)) {
        filePath = SITEMAP_FILE_RENEW
      } else {
        filePath = SITEMAP_FILE
      }
    }

    return filePath
  }
})() // generateMainSitemapPath

export const handleFinishCrawlSitemap = () => {
  if (fs.existsSync(SITEMAPS_RENEW_DIR)) {
    if (fs.existsSync(SITEMAPS_DIR)) {
      fs.rmSync(SITEMAPS_DIR, { recursive: true, force: true })
    }

    fs.renameSync(SITEMAPS_RENEW_DIR, SITEMAPS_DIR)
  }

  if (fs.existsSync(SITEMAP_FILE_RENEW)) {
    if (fs.existsSync(SITEMAP_FILE)) {
      fs.unlinkSync(SITEMAP_FILE)
    }

    fs.renameSync(SITEMAP_FILE_RENEW, SITEMAP_FILE)
  }
} // handleFinishCrawlSitemap

export const delay = (timing = 5000) => {
  return new Promise((res) => setTimeout(res, timing))
} // delay
