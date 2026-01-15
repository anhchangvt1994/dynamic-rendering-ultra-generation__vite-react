import { Page } from 'puppeteer'
import WorkerPool from 'workerpool'
import apiService from '../../../api/index.crawler'
import ServerConfig from '../../../server.config'
import Console from '../../../utils/ConsoleHandler'
import { getViewsPath } from '../../../utils/PathHandler'
import {
  CACHEABLE_STATUS_CODE,
  DESKTOP_UA,
  MOBILE_UA,
  regexNotFoundPageID,
  regexQueryStringSpecialInfo,
} from '../../constants'
import { SSRResult } from '../../types'
import BrowserManager from '../BrowserManager'
import CacheManager from '../CacheManager.worker/utils'
import { compressContent } from '../OptimizeHtml.worker/utils'
import {
  getInternalHTML,
  getInternalScript,
  getInternalStyle,
} from './utils/utils'

const viewsPath = getViewsPath()

interface SSRHandlerParam {
  url: string
  baseUrl: string
}

const browserManager = BrowserManager()

const _getSafePage = (page: Page) => {
  const SafePage = page

  return () => {
    if (SafePage && SafePage.isClosed()) return
    return SafePage
  }
} // _getSafePage

const waitResponse = (() => {
  return async (page: Page, url: string) => {
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

        const result = await new Promise<any>((resolveAfterPageLoad) => {
          safePage()
            ?.goto(url, {
              waitUntil: 'domcontentloaded',
            })
            .then((res) => resolveAfterPageLoad(res))
            .catch((err) => {
              reject(err)
            })
        })

        const html = (await safePage()?.content()) ?? ''

        if (regexNotFoundPageID.test(html)) return resolve(result)

        await new Promise((resolveAfterPageLoadInFewSecond) => {
          if (pendingRequests <= 0) {
            return resolveAfterPageLoadInFewSecond(null)
          }

          const startTimeout = (() => {
            let timeout
            return (duration = 500) => {
              if (timeout) clearTimeout(timeout)
              timeout = setTimeout(resolveAfterPageLoadInFewSecond, duration)
            }
          })()

          startTimeout()

          safePage()?.on('requestfinished', () => {
            startTimeout(150)
          })
          safePage()?.on('requestservedfromcache', () => {
            startTimeout(150)
          })
          safePage()?.on('requestfailed', () => {
            startTimeout(150)
          })

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

const SSRHandler = async (params: SSRHandlerParam) => {
  if (!browserManager || !params) return

  const browser = await browserManager.get()

  if (!browser || !browser.connected) return

  const { url, baseUrl } = params
  const cacheManager = CacheManager(url, viewsPath)

  let html = ''
  let status = 200

  const specialInfo = regexQueryStringSpecialInfo.exec(url)?.groups ?? {}

  if (browser && browser.connected) {
    const page = await browser.newPage()
    const safePage = _getSafePage(page)

    const deviceInfo = specialInfo.deviceInfo
      ? JSON.parse(specialInfo.deviceInfo)
      : {}

    try {
      await Promise.all([
        safePage()?.setUserAgent(deviceInfo.isMobile ? MOBILE_UA : DESKTOP_UA),
        safePage()?.waitForNetworkIdle({ idleTime: 150 }),
        safePage()?.setCacheEnabled(false),
        safePage()?.setRequestInterception(true),
        // safePage()?.setViewport({ width: 1366, height: 768 }),
        safePage()?.setExtraHTTPHeaders({
          ...specialInfo,
          service: 'puppeteer',
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
          const reqUrl = req.url()

          if (resourceType.includes('fetch')) {
            const urlInfo = new URL(reqUrl)
            if (urlInfo.pathname.startsWith('/api')) {
              apiService(req)
                .then((res) => {
                  req.respond(res)
                })
                .catch((err) => {
                  Console.error(err)
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
              const tmpPointsTo = (
                ServerConfig.routes.list?.[urlInfo.pathname] ??
                ServerConfig.routes.custom?.(reqUrl)
              )?.pointsTo

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

              getInternalHTML({
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
                  Console.error(err)
                  req.continue()
                })
            } else {
              req.continue()
            }
          } else if (resourceType === 'script' && reqUrl.startsWith(baseUrl)) {
            getInternalScript({ url: reqUrl })
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
                Console.error(err)
                req.continue()
              })
          } else {
            req.continue()
          }
        }
      })

      Console.log(`Start to crawl: ${url}`)

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
        Console.log('SSRHandler line 341:')
        Console.error('err name: ', err.name)
        Console.error('err message: ', err.message)
        throw new Error('Internal Error')
      } finally {
        status = response?.status?.() ?? status
        Console.log(`Internal crawler status: ${status}`)
      }
    } catch (err) {
      Console.log('SSRHandler line 297:')
      Console.log('Crawler is fail!')
      Console.error(err)
      safePage()?.close()

      return {
        status: 500,
      }
    }

    if (CACHEABLE_STATUS_CODE[status]) {
      try {
        html = (await safePage()?.content()) ?? '' // serialized HTML of page DOM.
        safePage()?.close()
      } catch (err) {
        Console.log('SSRHandler line 315:')
        Console.error(err)
        safePage()?.close()

        return
      }

      status = html && regexNotFoundPageID.test(html) ? 404 : 200
    }
  }

  let result: SSRResult
  if (CACHEABLE_STATUS_CODE[status]) {
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
                  /href=("|'|)(?<href>[A-Za-z0-9_\-\/]{0,}\.css)("|'|)/.exec(
                    style
                  )?.groups?.href

                if (href) {
                  const styleResult = getInternalStyle({
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
          Console.error(err)
        }
      } else {
        const urlInfo = new URL(url)
        html = html.replace(
          '<head>',
          `<head><base href="${urlInfo.origin}/" target="_blank">`
        )
      }
    } catch (err) {
      Console.error(err)
    }

    try {
      html = await compressContent(html)
    } catch (err) {
      Console.error(err)
    }

    result = await cacheManager.set({
      html,
      isRaw: false,
    })
  } else {
    cacheManager.remove().catch((err) => {
      Console.error(err)
    })
    return {
      status,
      html: status === 404 ? 'Page not found!' : html,
    }
  }

  return result
} // SSRHandler

WorkerPool.worker({
  SSRHandler,
  finish: () => {
    return 'finish'
  },
})
