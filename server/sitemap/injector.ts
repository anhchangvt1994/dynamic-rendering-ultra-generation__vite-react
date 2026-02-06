import { FREQ_LIST, SITEMAP_FILE } from './constants'
import { ISitemapInfo } from './types'
import { generateFilePath } from './utils/utils'

const generateSitemapInfo = (url): ISitemapInfo => {
  let file = SITEMAP_FILE
  const loc = url
  const lastmod = new Date().toISOString()
  let changefreq = FREQ_LIST.DAILY as any
  let priority = 1

  const urlInfo = new URL(url)

  if (urlInfo.pathname.endsWith('/blogs')) {
    file = generateFilePath('blog-sitemap')
    changefreq = FREQ_LIST.WEEKLY
    priority = 0.8
  } else if (urlInfo.pathname.includes('/pokemon')) {
    file = generateFilePath('pokemon-sitemap')
    changefreq = FREQ_LIST.MONTHLY
    priority = 0.6
  }

  return { file, loc, lastmod, changefreq, priority }
}

export default generateSitemapInfo
