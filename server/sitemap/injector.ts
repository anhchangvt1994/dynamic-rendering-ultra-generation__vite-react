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
  const lastmod = new Date().toISOString()

  return (url): ISitemapInfo => {
    if (!url) return

    const normalizedUrl = normalizeUrl(url)

    if (visitedUrls.has(normalizedUrl)) return

    visitedUrls.add(normalizedUrl)

    let mainFile = ''
    let mainLoc = ''
    let file = generateMainSitemapPath()
    let loc = normalizedUrl
    let changefreq = FREQ_LIST.DAILY as any
    let priority = 1

    const urlInfo = new URL(normalizedUrl)

    if (urlInfo.pathname.includes('/blogs')) {
      file = generateSubSitemapPath('blog-sitemap')
      changefreq = FREQ_LIST.WEEKLY
      priority = 0.8
    } else if (urlInfo.pathname.includes('/pokemon')) {
      file = generateSubSitemapPath('pokemon-sitemap')
      changefreq = FREQ_LIST.MONTHLY
      priority = 0.6
    }

    if (!/\/(sitemap.xml|sitemap.renew.xml)+$/g.test(file)) {
      const fileSplitted = file.split('/')
      mainLoc = `${PROCESS_ENV.HOST}/sitemaps/${fileSplitted[fileSplitted.length - 1]}`

      if (!visitedUrls.has(mainLoc)) {
        mainFile = generateMainSitemapPath()
        visitedUrls.add(mainLoc)
      }
    }

    return { file, mainFile, loc, mainLoc, lastmod, changefreq, priority }
  }
})()

export default generateSitemapInfo
