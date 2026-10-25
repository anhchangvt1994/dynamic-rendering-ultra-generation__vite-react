import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  COUNTRY_CODE_DEFAULT,
  LANGUAGE_CODE_DEFAULT,
  SERVER_LESS,
} from '../../constants'
import ServerConfig from '../../server.config'
import Console from '../../utils/ConsoleHandler'
import { ENV, ENV_MODE, MODE, PROCESS_ENV } from '../../utils/InitEnv'
import { getPagesPath } from '../../utils/PathHandler'
import { HttpResponse } from 'uWebSockets.js'
import { convertUrlHeaderToQueryString } from './FormatUrl.uws'
import ISRGenerator, { getRunningCrawlCount } from './ISRGenerator.next'
import CacheManager from './ISRGenerator.next/CacheManager.worker/utils'

/**
 * NOTE - Prerender of the sitemap pages
 * A page used to be rendered on its first visit only, so that visit waited for
 * the render. The sitemap urls are rendered ahead (desktop and mobile, the
 * page cache key depends on the device), one at a time and only while no
 * other crawl runs, so bots get them from the cache at once.
 * One server process prerenders (lock file), ISR_PRERENDER=false disables it.
 */
const IS_ENABLED =
  !['false', '0'].includes(String(PROCESS_ENV.ISR_PRERENDER).toLowerCase()) &&
  ServerConfig.crawl.enable &&
  !SERVER_LESS &&
  !ServerConfig.isRemoteCrawler &&
  ENV_MODE !== 'development'

const SITEMAP_PATH =
  (PROCESS_ENV.ISR_PRERENDER_SITEMAP_PATH as string) ||
  path.resolve(__dirname, '../../../sitemap/sitemaps')
// NOTE - Scan again for missing pages (expired / new ones)
const RESCAN_INTERVAL =
  Number(PROCESS_ENV.ISR_PRERENDER_INTERVAL_MS) || 30 * 60 * 1000
const TICK_INTERVAL = 1000
const LOCK_FILE = path.join(os.tmpdir(), 'isr-prerender.lock')

const DEVICES = [
  { type: 'desktop', isMobile: false },
  { type: 'mobile', isMobile: true },
]

const pagesPath = getPagesPath()

const _acquireLock = () => {
  try {
    const ownerPid = Number(fs.readFileSync(LOCK_FILE, 'utf8'))
    if (ownerPid && ownerPid !== process.pid) {
      process.kill(ownerPid, 0)
      return false // NOTE - Another live process prerenders
    }
  } catch {}

  try {
    fs.writeFileSync(LOCK_FILE, String(process.pid))
    return true
  } catch {
    return false
  }
} // _acquireLock

const _getSitemapPaths = () => {
  const paths = new Set<string>()

  try {
    for (const file of fs.readdirSync(SITEMAP_PATH)) {
      if (!file.endsWith('.xml')) continue

      const xml = fs.readFileSync(path.join(SITEMAP_PATH, file), 'utf8')
      for (const [, loc] of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
        try {
          paths.add(new URL(loc.trim()).pathname)
        } catch {}
      }
    }
  } catch (err) {
    Console.error('ISR prerender can not read the sitemap:', err)
  }

  return [...paths]
} // _getSitemapPaths

// NOTE - Built by the same function as a bot request, so the page cache key is
// the same (ex: deviceInfo is only in the url when the route content depends
// on the device)
const _getCrawlUrl = (pathname: string, device: (typeof DEVICES)[number]) =>
  convertUrlHeaderToQueryString({
    url: `${PROCESS_ENV.BASE_URL}${pathname}`,
    res: {
      cookies: {
        botInfo: { isBot: true, name: 'isr-prerender' },
        deviceInfo: device,
        localeInfo: {
          lang: LANGUAGE_CODE_DEFAULT,
          country: COUNTRY_CODE_DEFAULT,
          clientLang: LANGUAGE_CODE_DEFAULT,
          clientCountry: COUNTRY_CODE_DEFAULT,
          defaultLang: LANGUAGE_CODE_DEFAULT,
          defaultCountry: COUNTRY_CODE_DEFAULT,
          hideDefaultLocale: Boolean(ServerConfig.locale.hideDefaultLocale),
        },
        environmentInfo: { ENV, MODE, ENV_MODE },
      },
    } as unknown as HttpResponse,
    isISR: true,
  }) // _getCrawlUrl

const _isCached = async (url: string) => {
  const result = await CacheManager(url, pagesPath).achieve()
  return Boolean(result && !result.isRaw)
} // _isCached

const ISRPrerender = (() => {
  // NOTE - The url is built when it is crawled: BASE_URL is only known from
  // the first request
  let queue: { pathname: string; device: (typeof DEVICES)[number] }[] = []
  let isStarted = false

  const _scan = () => {
    queue = _getSitemapPaths().flatMap((pathname) =>
      DEVICES.map((device) => ({ pathname, device }))
    )
    Console.log(`ISR prerender: ${queue.length} sitemap urls to check`)
  } // _scan

  const _tick = async () => {
    // NOTE - BASE_URL is known from the first request
    if (!PROCESS_ENV.BASE_URL) return
    if (!queue.length) return
    if (getRunningCrawlCount() > 0) return

    while (queue.length) {
      const { pathname, device } = queue.shift() as (typeof queue)[number]
      const url = _getCrawlUrl(pathname, device)

      if (await _isCached(url)) continue

      ISRGenerator({ url, isSkipWaiting: true }).catch((err) =>
        Console.error(err)
      )
      return
    }
  } // _tick

  return {
    start: () => {
      if (!IS_ENABLED || isStarted || !_acquireLock()) return
      isStarted = true

      _scan()
      setInterval(() => {
        _tick().catch((err) => Console.error(err))
      }, TICK_INTERVAL).unref()
      setInterval(_scan, RESCAN_INTERVAL).unref()
    },
  }
})()

export default ISRPrerender
