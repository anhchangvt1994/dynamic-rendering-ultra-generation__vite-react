import fs from 'node:fs'
import path from 'node:path'

const SITEMAP_DIR = path.join(__dirname, '..', '..', 'sitemap')
const SITEMAP_FILE = path.join(SITEMAP_DIR, 'sitemap.xml')

export const saveUrlToSitemap = (
  url: string,
  lastmod?: string,
  changefreq?:
    | 'always'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'yearly'
    | 'never',
  priority?: number
): void => {
  // Normalize URL by removing trailing slashes
  const normalizedUrl = url.replace(/\/$/, '') || url

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
}
