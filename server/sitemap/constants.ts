import path from 'path'

export const SITEMAP_DIR = path.join(__dirname, '..', '..', 'sitemap')
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
