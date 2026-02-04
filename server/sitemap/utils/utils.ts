import fs from 'node:fs'
import path from 'path'
import {
  FREQ_DEFAULT,
  FREQ_PATH_LIST,
  SITEMAP_DIR,
  SITEMAP_FILE,
} from '../../sitemap/constants'
import Console from '../../src/utils/ConsoleHandler'
import { PROCESS_ENV } from '../../src/utils/InitEnv'

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
  url: string
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
  const { url = '', lastmod = '', changefreq = '', priority = 0 } = params

  if (!url) {
    Console.error('Need provide `url`')
    return
  }

  // Normalize URL by removing trailing slashes
  const normalizedUrl = normalizeUrl(url)

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

  // Create directory if not exists
  if (!fs.existsSync(SITEMAP_DIR)) {
    fs.mkdirSync(SITEMAP_DIR, { recursive: true })
  }

  // Create file with header if not exists
  if (!fs.existsSync(SITEMAP_FILE)) {
    fs.writeFileSync(
      SITEMAP_FILE,
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>'
    )
  }

  // Read current content
  let content = fs.readFileSync(SITEMAP_FILE, 'utf-8')

  // Check for duplicate (using normalized URL)
  if (content.includes(`<loc>${normalizedUrl}</loc>`)) {
    return
  }

  // Insert new URL before closing tag
  content = content.replace('</urlset>', `${newUrl}</urlset>`)

  // Write back
  fs.writeFileSync(SITEMAP_FILE, content)
} // saveUrlToSitemap

export const generateFilePath = (name): string => {
  if (!name) return ''

  const filePath = path.join(SITEMAP_DIR, name)
  return ''
} // generateFilePath
