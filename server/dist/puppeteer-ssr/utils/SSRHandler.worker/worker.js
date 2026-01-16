"use strict"; function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } async function _asyncNullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return await rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
var _workerpool = require('workerpool'); var _workerpool2 = _interopRequireDefault(_workerpool);
var _indexcrawler = require('../../../api/index.crawler'); var _indexcrawler2 = _interopRequireDefault(_indexcrawler);
var _serverconfig = require('../../../server.config'); var _serverconfig2 = _interopRequireDefault(_serverconfig);
var _ConsoleHandler = require('../../../utils/ConsoleHandler'); var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler);
var _PathHandler = require('../../../utils/PathHandler');






var _constants = require('../../constants');

var _BrowserManager = require('../BrowserManager'); var _BrowserManager2 = _interopRequireDefault(_BrowserManager);
var _utils = require('../CacheManager.worker/utils'); var _utils2 = _interopRequireDefault(_utils);
var _utils3 = require('../OptimizeHtml.worker/utils');




var _utils5 = require('./utils/utils');

const viewsPath = _PathHandler.getViewsPath.call(void 0, )






const browserManager = _BrowserManager2.default.call(void 0, )

const _getSafePage = (page) => {
  const SafePage = page

  return () => {
    if (SafePage && SafePage.isClosed()) return
    return SafePage
  }
} // _getSafePage

const waitResponse = (() => {
  return async (page, url) => {
    const safePage = _getSafePage(page)

    let response
    try {
      response = await new Promise(async (resolve, reject) => {
        let pendingRequests = 0

        safePage().on('request', () => {
          pendingRequests++
        })
        safePage().on('requestfinished', () => {
          pendingRequests--
        })
        safePage().on('requestfailed', () => {
          pendingRequests--
        })

        const result = await new Promise((resolveAfterPageLoad) => {
          _optionalChain([safePage, 'call', _ => _()
, 'optionalAccess', _2 => _2.goto, 'call', _3 => _3(url, {
              waitUntil: 'networkidle2',
            })
, 'access', _4 => _4.then, 'call', _5 => _5((res) => resolveAfterPageLoad(res))
, 'access', _6 => _6.catch, 'call', _7 => _7((err) => {
              reject(err)
            })])
        })

        const html = await _asyncNullishCoalesce((await _optionalChain([safePage, 'call', _8 => _8(), 'optionalAccess', _9 => _9.content, 'call', _10 => _10()])), async () => ( ''))

        if (_constants.regexNotFoundPageID.test(html)) return resolve(result)

        await new Promise((resolveAfterPageLoadInFewSecond) => {
          // if (pendingRequests <= 0) {
          //   return resolveAfterPageLoadInFewSecond(null)
          // }

          const startTimeout = (() => {
            let timeout
            return (duration = 500) => {
              if (timeout) clearTimeout(timeout)
              timeout = setTimeout(resolveAfterPageLoadInFewSecond, duration)
            }
          })()

          startTimeout()

          _optionalChain([safePage, 'call', _11 => _11(), 'optionalAccess', _12 => _12.on, 'call', _13 => _13('requestfinished', () => {
            startTimeout(250)
          })])
          _optionalChain([safePage, 'call', _14 => _14(), 'optionalAccess', _15 => _15.on, 'call', _16 => _16('requestservedfromcache', () => {
            startTimeout(250)
          })])
          _optionalChain([safePage, 'call', _17 => _17(), 'optionalAccess', _18 => _18.on, 'call', _19 => _19('requestfailed', () => {
            startTimeout(250)
          })])

          setTimeout(resolveAfterPageLoadInFewSecond, 20000)
        })

        safePage().removeAllListeners('request')
        safePage().removeAllListeners('requestfinished')
        safePage().removeAllListeners('requestservedfromcache')
        safePage().removeAllListeners('requestfailed')

        setTimeout(() => {
          resolve(pendingRequests > 3 ? { status: () => 503 } : result)
        }, 300)
      })
    } catch (err) {
      throw err
    }

    return response
  }
})() // waitResponse

const SSRHandler = async (params) => {
  if (!browserManager || !params) return

  const browser = await browserManager.get()

  if (!browser || !browser.connected) return

  const { url, baseUrl } = params
  const cacheManager = _utils2.default.call(void 0, url, viewsPath)

  let html = ''
  let status = 200

  const specialInfo = _nullishCoalesce(_optionalChain([_constants.regexQueryStringSpecialInfo, 'access', _20 => _20.exec, 'call', _21 => _21(url), 'optionalAccess', _22 => _22.groups]), () => ( {}))

  if (browser && browser.connected) {
    const page = await browser.newPage()
    const safePage = _getSafePage(page)

    const deviceInfo = specialInfo.deviceInfo
      ? JSON.parse(specialInfo.deviceInfo)
      : {}

    try {
      await Promise.all([
        _optionalChain([safePage, 'call', _23 => _23(), 'optionalAccess', _24 => _24.setUserAgent, 'call', _25 => _25(deviceInfo.isMobile ? _constants.MOBILE_UA : _constants.DESKTOP_UA)]),
        _optionalChain([safePage, 'call', _26 => _26(), 'optionalAccess', _27 => _27.waitForNetworkIdle, 'call', _28 => _28({ idleTime: 150 })]),
        _optionalChain([safePage, 'call', _29 => _29(), 'optionalAccess', _30 => _30.setCacheEnabled, 'call', _31 => _31(false)]),
        _optionalChain([safePage, 'call', _32 => _32(), 'optionalAccess', _33 => _33.setRequestInterception, 'call', _34 => _34(true)]),
        _optionalChain([safePage, 'call', _35 => _35(), 'optionalAccess', _36 => _36.setExtraHTTPHeaders, 'call', _37 => _37({
          ...specialInfo,
          service: 'puppeteer',
        })]),
        _optionalChain([safePage, 'call', _38 => _38(), 'optionalAccess', _39 => _39.evaluateOnNewDocument, 'call', _40 => _40(() => {
          const getContext = HTMLCanvasElement.prototype.getContext
          HTMLCanvasElement.prototype.getContext = function (type) {
            if (type === '2d' || type === 'webgl') {
              return null
            }
            return getContext.call(this, type)
          }
        })]),
      ])

      _optionalChain([safePage, 'call', _41 => _41(), 'optionalAccess', _42 => _42.on, 'call', _43 => _43('request', async (req) => {
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
          const reqUrl = req.url()

          if (resourceType.includes('fetch')) {
            const urlInfo = new URL(reqUrl)
            if (urlInfo.pathname.startsWith('/api')) {
              _indexcrawler2.default.call(void 0, req)
                .then((res) => {
                  req.respond(res)
                })
                .catch((err) => {
                  _ConsoleHandler2.default.error(err)
                  req.continue()
                })
            } else {
              req.continue()
              // return req.respond({
              //   status: 200,
              // })
            }
          } else if (
            resourceType === 'document' &&
            reqUrl.startsWith(baseUrl)
          ) {
            const urlInfo = new URL(reqUrl)
            const pointsTo = (() => {
              const tmpPointsTo = _optionalChain([(
                _nullishCoalesce(_optionalChain([_serverconfig2.default, 'access', _44 => _44.routes, 'access', _45 => _45.list, 'optionalAccess', _46 => _46[urlInfo.pathname]]), () => (
                _optionalChain([_serverconfig2.default, 'access', _47 => _47.routes, 'access', _48 => _48.custom, 'optionalCall', _49 => _49(reqUrl)])))
              ), 'optionalAccess', _50 => _50.pointsTo])

              if (!tmpPointsTo) return ''

              return typeof tmpPointsTo === 'string'
                ? tmpPointsTo
                : tmpPointsTo.url
            })()

            if (!pointsTo || pointsTo.startsWith(baseUrl)) {
              const enableAPIStore =
                !reqUrl.includes('renderingInfo={"type":"SSR"}') ||
                !pointsTo ||
                pointsTo.startsWith(baseUrl)

              _utils5.getInternalHTML.call(void 0, {
                url: reqUrl,
                enableAPIStore,
              })
                .then((result) => {
                  if (!result)
                    req.respond({
                      body: 'File not found',
                      status: 404,
                      contentType: 'text/html',
                    })
                  else {
                    req.respond({
                      body: result.body,
                      status: result.status,
                      contentType: 'text/html',
                    })
                  }
                })
                .catch((err) => {
                  _ConsoleHandler2.default.error(err)
                  req.continue()
                })
            } else {
              req.continue()
            }
          } else if (resourceType === 'script' && reqUrl.startsWith(baseUrl)) {
            _utils5.getInternalScript.call(void 0, { url: reqUrl })
              .then((result) => {
                if (!result)
                  req.respond({
                    body: 'File not found',
                    status: 404,
                    contentType: 'application/javascript',
                  })
                else
                  req.respond({
                    body: result.body,
                    status: result.status,
                    contentType: 'application/javascript',
                  })
              })
              .catch((err) => {
                _ConsoleHandler2.default.error(err)
                req.continue()
              })
          } else {
            req.continue()
          }
        }
      })])

      _ConsoleHandler2.default.log(`Start to crawl: ${url}`)

      let response

      try {
        const urlToCrawl = url.startsWith(baseUrl)
          ? url
          : url.replace(
              /botInfo=([^&]*)&deviceInfo=([^&]*)&localeInfo=([^&]*)&environmentInfo=([^&]*)&renderingInfo=([^&]*)/,
              ''
            )
        response = await waitResponse(page, urlToCrawl)
      } catch (err) {
        _ConsoleHandler2.default.log('SSRHandler line 341:')
        _ConsoleHandler2.default.error('err name: ', err.name)
        _ConsoleHandler2.default.error('err message: ', err.message)
        throw new Error('Internal Error')
      } finally {
        status = _nullishCoalesce(_optionalChain([response, 'optionalAccess', _51 => _51.status, 'optionalCall', _52 => _52()]), () => ( status))
        _ConsoleHandler2.default.log(`Internal crawler status: ${status}`)
      }
    } catch (err) {
      _ConsoleHandler2.default.log('SSRHandler line 297:')
      _ConsoleHandler2.default.log('Crawler is fail!')
      _ConsoleHandler2.default.error(err)
      _optionalChain([safePage, 'call', _53 => _53(), 'optionalAccess', _54 => _54.close, 'call', _55 => _55()])

      return {
        status: 500,
      }
    }

    if (_constants.CACHEABLE_STATUS_CODE[status]) {
      try {
        html = await _asyncNullishCoalesce((await _optionalChain([safePage, 'call', _56 => _56(), 'optionalAccess', _57 => _57.content, 'call', _58 => _58()])), async () => ( '')) // serialized HTML of page DOM.
        _optionalChain([safePage, 'call', _59 => _59(), 'optionalAccess', _60 => _60.close, 'call', _61 => _61()])
      } catch (err) {
        _ConsoleHandler2.default.log('SSRHandler line 315:')
        _ConsoleHandler2.default.error(err)
        _optionalChain([safePage, 'call', _62 => _62(), 'optionalAccess', _63 => _63.close, 'call', _64 => _64()])

        return
      }

      status = html && _constants.regexNotFoundPageID.test(html) ? 404 : 200
    }
  }

  let result
  if (_constants.CACHEABLE_STATUS_CODE[status]) {
    try {
      let scriptTags = ''

      if (url.startsWith(baseUrl)) {
        html = html
          .replace(
            /(?<script><script(\s[^>]+)src=("|'|)(.*?)("|'|)(\s[^>]+)*>(.|[\r\n])*?<\/script>)/g,
            (script) => {
              if (script) {
                script = script.replace('<script', '<script defer')
                scriptTags += script
              }
              return ''
            }
          )
          .replace('</body>', scriptTags + '</body>')
          .replace(
            /(?<style><link(\s[^>]+)href=("|'|)[A-Za-z0-9_\-\/]{0,}\.css("|'|)[^>\s]*>)/g,
            (style) => {
              if (style) {
                const href =
                  _optionalChain([/href=("|'|)(?<href>[A-Za-z0-9_\-\/]{0,}\.css)("|'|)/, 'access', _65 => _65.exec, 'call', _66 => _66(
                    style
                  ), 'optionalAccess', _67 => _67.groups, 'optionalAccess', _68 => _68.href])

                if (href) {
                  const styleResult = _utils5.getInternalStyle.call(void 0, {
                    url: href,
                  })

                  if (styleResult && styleResult.status === 200) {
                    return `<style>${styleResult.body}</style>`
                  }
                }
              }

              return ''
            }
          )

        try {
          html = html.replace(
            /<link\s+(?=.*(rel=["']?(dns-prefetch|preconnect|modulepreload|preload|prefetch)["']?).*?(\/|)?)(?:.*?\/?>)/g,
            ''
          )
        } catch (err) {
          _ConsoleHandler2.default.error(err)
        }
      } else {
        const urlInfo = new URL(url)
        html = html.replace(
          '<head>',
          `<head><base href="${urlInfo.origin}/" target="_blank">`
        )
      }
    } catch (err) {
      _ConsoleHandler2.default.error(err)
    }

    try {
      html = await _utils3.compressContent.call(void 0, html)
    } catch (err) {
      _ConsoleHandler2.default.error(err)
    }

    result = await cacheManager.set({
      html,
      isRaw: false,
    })
  } else {
    cacheManager.remove().catch((err) => {
      _ConsoleHandler2.default.error(err)
    })
    return {
      status,
      html: status === 404 ? 'Page not found!' : html,
    }
  }

  return result
} // SSRHandler

_workerpool2.default.worker({
  SSRHandler,
  finish: () => {
    return 'finish'
  },
})
