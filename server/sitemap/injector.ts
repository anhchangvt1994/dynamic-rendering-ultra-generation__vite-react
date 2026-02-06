import { PROCESS_ENV } from '../src/utils/InitEnv'
import { FREQ_LIST } from './constants'
import { ISitemapInfo } from './types'
import {
  generateMainSitemapPath,
  generateSubSitemapPath,
  normalizeUrl,
} from './utils/utils'

const generateSitemapInfo = (() => {
  const visitedUrls = new Set()

  return (url): ISitemapInfo => {
    if (!url) return

    const normalizedUrl = normalizeUrl(url)

    if (visitedUrls.has(normalizedUrl)) return

    visitedUrls.add(normalizedUrl)

    let file = generateMainSitemapPath()
    let loc = normalizedUrl
    const lastmod = new Date().toISOString()
    let changefreq = FREQ_LIST.DAILY as any
    let priority = 1

    const urlInfo = new URL(normalizedUrl)

    if (urlInfo.pathname.endsWith('/blogs')) {
      file = generateSubSitemapPath('blog-sitemap')
      loc = `${PROCESS_ENV.HOST}/sitemaps/blog-sitemap.xml`
      changefreq = FREQ_LIST.WEEKLY
      priority = 0.8
    } else if (urlInfo.pathname.includes('/pokemon')) {
      file = generateSubSitemapPath('pokemon-sitemap')
      loc = `${PROCESS_ENV.HOST}/sitemaps/pokemon-sitemap.xml`
      changefreq = FREQ_LIST.MONTHLY
      priority = 0.6
    }

    return { file, loc, lastmod, changefreq, priority }
  }
})()

export default generateSitemapInfo
