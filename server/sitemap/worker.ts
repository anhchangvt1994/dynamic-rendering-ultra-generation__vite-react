import { Page } from 'puppeteer'
import WorkerPool from 'workerpool'
import { puppeteer } from '../src/puppeteer-ssr/constants'
import Console from '../src/utils/ConsoleHandler'
import { PROCESS_ENV } from '../src/utils/InitEnv'

interface ICrawlHandlerParams {
  url: string
  wsEndpoint?: string
}

const _getSafePage = (page: Page) => {
  const SafePage = page

  return () => {
    if (SafePage && SafePage.isClosed()) return
    return SafePage
  }
} // _getSafePage

const crawlHandler = async (params: ICrawlHandlerParams) => {
  const { url, wsEndpoint } = params

  if (!url || !wsEndpoint) return

  let html = ''
  let status = 200
  let browser

  try {
    browser = await puppeteer.connect({ browserWSEndpoint: wsEndpoint })
  } catch (err) {
    Console.error('Failed to connect to browser:', err.message)
    return { status: 500 }
  }

  if (browser && browser.connected) {
    const page = await browser.newPage()

    if (!page) {
      return { status: 500 }
    }

    const safePage = _getSafePage(page)

    try {
      await Promise.all([
        safePage()?.setUserAgent(
          'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
        ),
        safePage()?.waitForNetworkIdle({ idleTime: 150 }),
        safePage()?.setCacheEnabled(false),
        safePage()?.setRequestInterception(true),
        safePage()?.setExtraHTTPHeaders({
          service: 'sitemap-crawler',
        }),
        safePage()?.evaluateOnNewDocument(() => {
          const getContext = HTMLCanvasElement.prototype.getContext
          HTMLCanvasElement.prototype.getContext = function (type) {
            if (type === '2d' || type === 'webgl') {
              return null
            }
            return getContext.call(this, type)
          }
        }),
      ])

      safePage()?.on('request', async (req) => {
        const resourceType = req.resourceType()

        if (resourceType === 'stylesheet') {
          req.respond({ status: 200, body: 'aborted' })
        } else if (
          /(socket.io.min.js)+(?:$)|data:image\/[a-z]*.?\;base64/.test(url) ||
          /googletagmanager.com|connect.facebook.net|asia.creativecdn.com|static.hotjar.com|deqik.com|contineljs.com|googleads.g.doubleclick.net|analytics.tiktok.com|google.com|gstatic.com|static.airbridge.io|googleadservices.com|google-analytics.com|sg.mmstat.com|t.contentsquare.net|accounts.google.com|browser.sentry-cdn.com|bat.bing.com|tr.snapchat.com|ct.pinterest.com|criteo.com|webchat.caresoft.vn|tags.creativecdn.com|script.crazyegg.com|tags.tiqcdn.com|trc.taboola.com|securepubads.g.doubleclick.net|partytown/.test(
            req.url()
          ) ||
          ['font', 'image', 'media', 'imageset'].includes(resourceType)
        ) {
          req.abort()
        } else {
          req.continue()
        }
      })

      let response

      try {
        response = await safePage()?.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        })
      } catch (err) {
        Console.log('ISRHandler line 341:')
        Console.error('err name: ', err.name)
        Console.error('err message: ', err.message)
        throw new Error('Internal Error')
      } finally {
        status = response?.status?.() ?? status
        if (status !== 200) return { status }

        Console.log(`Internal crawler status: ${status}`)
      }
    } catch (err) {
      Console.error('Error during page setup:', err.message)
      safePage()?.close()
      return { status: 500 }
    }

    try {
      html = (await safePage()?.content()) ?? ''
      safePage()?.close()
    } catch (err) {
      Console.log('ISRHandler line 315:')
      Console.error(err)
      safePage()?.close()

      return
    }

    // Extract href URLs from <a> tags in HTML
    // Handle both quoted and unquoted href values (e.g., href="/path" or href=/path)
    const linkRegex = /<a\s+[^>]*href\s*=\s*["']?([^"'\s>]+)["']?[^>]*>/gi
    const links: string[] = []
    let match

    Console.log(`Extracting links from HTML, length: ${html?.length || 0}`)

    while ((match = linkRegex.exec(html || '')) !== null) {
      const href = match[1]
      // Filter: href starts with "/" or starts with host
      const host = PROCESS_ENV.HOST || ''
      if (href.startsWith('/') || (host && href.startsWith(host))) {
        const hrefFormatted = href.startsWith('/')
          ? PROCESS_ENV.HOST.replace(/\/$/g, '') + href
          : href
        links.push(hrefFormatted)
      }
    }

    Console.log(`Found ${links.length} links to crawl`)

    return { status, data: links }
  }
} // crawlHandler

WorkerPool.worker({
  crawlHandler,
  finish: () => {
    return 'finish'
  },
})
