// Compatibility entry point for workerpool users. The CLI uses direct bounded
// async lanes, avoiding a TypeScript worker and a CDP connection for every URL.
import puppeteer from 'puppeteer-core'
import WorkerPool from 'workerpool'
import { crawlPage, prepareCrawlPage } from './crawl-page'

export const crawlHandler = async (params) => {
  const browser = await puppeteer.connect({
    browserWSEndpoint: params.wsEndpoint,
  })
  let page
  try {
    page = await browser.newPage()
    await prepareCrawlPage(page)
    return await crawlPage(page, params.url, {
      ...params,
      host: params.host || new URL(params.url).origin,
    })
  } finally {
    await page?.close().catch(() => {})
    await browser.disconnect()
  }
}

WorkerPool.worker({ crawlHandler, finish: () => 'finish' })
