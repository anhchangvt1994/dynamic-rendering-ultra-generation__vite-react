"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _fs = require('fs'); var _fs2 = _interopRequireDefault(_fs);
var _os = require('os'); var _os2 = _interopRequireDefault(_os);
var _path = require('path'); var _path2 = _interopRequireDefault(_path);




var _constants = require('../../constants');
var _serverconfig = require('../../server.config'); var _serverconfig2 = _interopRequireDefault(_serverconfig);
var _ConsoleHandler = require('../../utils/ConsoleHandler'); var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler);
var _InitEnv = require('../../utils/InitEnv');
var _PathHandler = require('../../utils/PathHandler');

var _FormatUrluws = require('./FormatUrl.uws');
var _ISRGeneratornext = require('./ISRGenerator.next'); var _ISRGeneratornext2 = _interopRequireDefault(_ISRGeneratornext);
var _utils = require('./ISRGenerator.next/CacheManager.worker/utils'); var _utils2 = _interopRequireDefault(_utils);

/**
 * NOTE - Prerender of the sitemap pages
 * A page used to be rendered on its first visit only, so that visit waited for
 * the render. The sitemap urls are rendered ahead (desktop and mobile, the
 * page cache key depends on the device), one at a time and only while no
 * other crawl runs, so bots get them from the cache at once.
 * One server process prerenders (lock file), ISR_PRERENDER=false disables it.
 */
const IS_ENABLED =
  !['false', '0'].includes(String(_InitEnv.PROCESS_ENV.ISR_PRERENDER).toLowerCase()) &&
  _serverconfig2.default.crawl.enable &&
  !_constants.SERVER_LESS &&
  !_serverconfig2.default.isRemoteCrawler &&
  _InitEnv.ENV_MODE !== 'development'

const SITEMAP_PATH =
  (_InitEnv.PROCESS_ENV.ISR_PRERENDER_SITEMAP_PATH ) ||
  _path2.default.resolve(__dirname, '../../../sitemap/sitemaps')
// NOTE - Scan again for missing pages (expired / new ones)
const RESCAN_INTERVAL =
  Number(_InitEnv.PROCESS_ENV.ISR_PRERENDER_INTERVAL_MS) || 30 * 60 * 1000
const TICK_INTERVAL = 1000
const LOCK_FILE = _path2.default.join(_os2.default.tmpdir(), 'isr-prerender.lock')

const DEVICES = [
  { type: 'desktop', isMobile: false },
  { type: 'mobile', isMobile: true },
]

const pagesPath = _PathHandler.getPagesPath.call(void 0, )

const _acquireLock = () => {
  try {
    const ownerPid = Number(_fs2.default.readFileSync(LOCK_FILE, 'utf8'))
    if (ownerPid && ownerPid !== process.pid) {
      process.kill(ownerPid, 0)
      return false // NOTE - Another live process prerenders
    }
  } catch (e) {}

  try {
    _fs2.default.writeFileSync(LOCK_FILE, String(process.pid))
    return true
  } catch (e2) {
    return false
  }
} // _acquireLock

const _getSitemapPaths = () => {
  const paths = new Set()

  try {
    for (const file of _fs2.default.readdirSync(SITEMAP_PATH)) {
      if (!file.endsWith('.xml')) continue

      const xml = _fs2.default.readFileSync(_path2.default.join(SITEMAP_PATH, file), 'utf8')
      for (const [, loc] of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
        try {
          paths.add(new URL(loc.trim()).pathname)
        } catch (e3) {}
      }
    }
  } catch (err) {
    _ConsoleHandler2.default.error('ISR prerender can not read the sitemap:', err)
  }

  return [...paths]
} // _getSitemapPaths

// NOTE - Built by the same function as a bot request, so the page cache key is
// the same (ex: deviceInfo is only in the url when the route content depends
// on the device)
const _getCrawlUrl = (pathname, device) =>
  _FormatUrluws.convertUrlHeaderToQueryString.call(void 0, {
    url: `${_InitEnv.PROCESS_ENV.BASE_URL}${pathname}`,
    res: {
      cookies: {
        botInfo: { isBot: true, name: 'isr-prerender' },
        deviceInfo: device,
        localeInfo: {
          lang: _constants.LANGUAGE_CODE_DEFAULT,
          country: _constants.COUNTRY_CODE_DEFAULT,
          clientLang: _constants.LANGUAGE_CODE_DEFAULT,
          clientCountry: _constants.COUNTRY_CODE_DEFAULT,
          defaultLang: _constants.LANGUAGE_CODE_DEFAULT,
          defaultCountry: _constants.COUNTRY_CODE_DEFAULT,
          hideDefaultLocale: Boolean(_serverconfig2.default.locale.hideDefaultLocale),
        },
        environmentInfo: { ENV: _InitEnv.ENV, MODE: _InitEnv.MODE, ENV_MODE: _InitEnv.ENV_MODE },
      },
    } ,
    isISR: true,
  }) // _getCrawlUrl

const _isCached = async (url) => {
  const result = await _utils2.default.call(void 0, url, pagesPath).achieve()
  return Boolean(result && !result.isRaw)
} // _isCached

const ISRPrerender = (() => {
  // NOTE - The url is built when it is crawled: BASE_URL is only known from
  // the first request
  let queue = []
  let isStarted = false

  const _scan = () => {
    queue = _getSitemapPaths().flatMap((pathname) =>
      DEVICES.map((device) => ({ pathname, device }))
    )
    _ConsoleHandler2.default.log(`ISR prerender: ${queue.length} sitemap urls to check`)
  } // _scan

  const _tick = async () => {
    // NOTE - BASE_URL is known from the first request
    if (!_InitEnv.PROCESS_ENV.BASE_URL) return
    if (!queue.length) return
    if (_ISRGeneratornext.getRunningCrawlCount.call(void 0, ) > 0) return

    while (queue.length) {
      const { pathname, device } = queue.shift() 
      const url = _getCrawlUrl(pathname, device)

      if (await _isCached(url)) continue

      _ISRGeneratornext2.default.call(void 0, { url, isSkipWaiting: true }).catch((err) =>
        _ConsoleHandler2.default.error(err)
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
        _tick().catch((err) => _ConsoleHandler2.default.error(err))
      }, TICK_INTERVAL).unref()
      setInterval(_scan, RESCAN_INTERVAL).unref()
    },
  }
})()

exports. default = ISRPrerender
