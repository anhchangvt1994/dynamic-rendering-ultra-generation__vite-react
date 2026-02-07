import path from 'path'

export const SITEMAP_DIR = path.join(__dirname, '..', 'sitemap')
export const SITEMAPS_DIR = path.join(__dirname, '..', 'sitemap', 'sitemaps')
export const SITEMAPS_RENEW_DIR = path.join(
  __dirname,
  '..',
  'sitemap',
  'sitemaps-renew'
)
export const SITEMAP_FILE = path.join(SITEMAP_DIR, 'sitemap.xml')
export const SITEMAP_FILE_RENEW = path.join(SITEMAP_DIR, 'sitemap.renew.xml')

export const FREQ_LIST = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  ALWAYS: 'always',
  HOURLY: 'hourly',
  YEARLY: 'yearly',
  NEVER: 'never',
}

export const FREQ_DEFAULT = FREQ_LIST.DAILY

export const FREQ_PATH_LIST = {
  [FREQ_LIST.DAILY]: ['/blogs', '/'],
  [FREQ_LIST.WEEKLY]: [],
}
