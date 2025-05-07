'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
function _nullishCoalesce(lhs, rhsFn) {
  if (lhs != null) {
    return lhs
  } else {
    return rhsFn()
  }
}
function _optionalChain(ops) {
  let lastAccessLHS = undefined
  let value = ops[0]
  let i = 1
  while (i < ops.length) {
    const op = ops[i]
    const fn = ops[i + 1]
    i += 2
    if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) {
      return undefined
    }
    if (op === 'access' || op === 'optionalAccess') {
      lastAccessLHS = value
      value = fn(value)
    } else if (op === 'call' || op === 'optionalCall') {
      value = fn((...args) => value.call(lastAccessLHS, ...args))
      lastAccessLHS = undefined
    }
  }
  return value
}
var _InitEnv = require('../InitEnv')
var _constants = require('./constants')

const defineServerConfig = (options) => {
  const serverConfig = { ...options }

  for (const key in _constants.defaultServerConfig) {
    if (key === 'locale') {
      if (serverConfig[key]) {
        const defaultOption = _constants.defaultServerConfig[key]

        serverConfig[key] = {
          ...defaultOption,
          ...serverConfig[key],
        }

        const serverLocaleConfigShorten = {
          enable: serverConfig[key].enable,
          defaultLang: serverConfig[key].defaultLang,
          defaultCountry: serverConfig[key].defaultCountry,
          hideDefaultLocale: serverConfig[key].hideDefaultLocale,
        }

        for (const localeRouteKey in serverConfig[key].routes) {
          if (serverConfig[key].routes[localeRouteKey]) {
            serverConfig[key].routes[localeRouteKey] = {
              ...serverLocaleConfigShorten,
              ...serverConfig[key].routes[localeRouteKey],
            }
          }
        }

        if (serverConfig[key].custom) {
          const customFunc = serverConfig[key].custom
          serverConfig[key].custom = (url) => {
            if (!url) return

            const tmpConfig = customFunc(url)

            const urlInfo = new URL(url)

            const defaultOptionOfCustom =
              serverConfig[key].routes[urlInfo.pathname] ||
              serverLocaleConfigShorten

            return {
              ...defaultOptionOfCustom,
              ...tmpConfig,
            }
          }
        }
      } else serverConfig[key] = _constants.defaultServerConfig[key]
    } // locale

    if (key === 'crawl') {
      if (options[key]) {
        const defaultOption = _constants.defaultServerConfig[key]

        serverConfig[key].cache = {
          ...defaultOption.cache,
          ...serverConfig[key].cache,
        }

        serverConfig[key] = {
          ...defaultOption,
          ...serverConfig[key],
        }

        const serverCrawlConfigShorten = {
          enable: serverConfig[key].enable,
          speed: serverConfig[key].speed,
          content: serverConfig[key].content,
          optimize: serverConfig[key].optimize,
          compress: serverConfig[key].compress,
          cache: serverConfig[key].cache,
        }

        for (const crawlRouteKey in serverConfig[key].routes) {
          if (serverConfig[key].routes[crawlRouteKey]) {
            serverConfig[key].routes[crawlRouteKey].cache = {
              ...serverCrawlConfigShorten.cache,
              ...serverConfig[key].routes[crawlRouteKey].cache,
            }
            serverConfig[key].routes[crawlRouteKey] = {
              ...serverCrawlConfigShorten,
              ...serverConfig[key].routes[crawlRouteKey],
            }
          }
        }

        if (serverConfig[key].custom) {
          const customFunc = serverConfig[key].custom
          serverConfig[key].custom = (url) => {
            if (!url) return

            const tmpConfig = customFunc(url) || {}

            const urlInfo = new URL(url)

            const defaultOptionOfCustom =
              serverConfig[key].routes[urlInfo.pathname] ||
              serverCrawlConfigShorten

            return {
              ...defaultOptionOfCustom,
              ...tmpConfig,
            }
          }
        }
      } else serverConfig[key] = _constants.defaultServerConfig[key]
    } // crawl

    if (key === 'routes') {
      if (serverConfig[key]) {
        const defaultOption = _constants.defaultServerConfig[key]

        serverConfig[key] = {
          ...defaultOption,
          ...serverConfig[key],
        }

        const defaultPreview = {
          content: 'same',
          time: 300,
          renewTime: 120,
        }

        if (serverConfig[key].preview) {
          if (typeof serverConfig[key].preview === 'boolean') {
            serverConfig[key].preview = defaultPreview
          } else if (!serverConfig[key].preview.content) {
            serverConfig[key].preview.content = 'same'
          }
        }

        for (const routeKey in serverConfig[key].list) {
          if (serverConfig[key].list[routeKey]) {
            if (serverConfig[key].list[routeKey].pointsTo) {
              serverConfig[key].list[routeKey] = {
                pointsTo:
                  typeof serverConfig[key].list[routeKey].pointsTo === 'string'
                    ? {
                        url: serverConfig[key].list[routeKey].pointsTo,
                        content: _nullishCoalesce(
                          _optionalChain([
                            serverConfig,
                            'access',
                            (_) => _[key],
                            'access',
                            (_2) => _2.preview,
                            'optionalAccess',
                            (_3) => _3.content,
                          ]),
                          () => 'same'
                        ),
                        time: _nullishCoalesce(
                          _optionalChain([
                            serverConfig,
                            'access',
                            (_4) => _4[key],
                            'access',
                            (_5) => _5.preview,
                            'optionalAccess',
                            (_6) => _6.time,
                          ]),
                          () => 'infinite'
                        ),
                        renewTime: _nullishCoalesce(
                          _optionalChain([
                            serverConfig,
                            'access',
                            (_7) => _7[key],
                            'access',
                            (_8) => _8.preview,
                            'optionalAccess',
                            (_9) => _9.renewTime,
                          ]),
                          () => 1800
                        ),
                      }
                    : {
                        ...{
                          content: _nullishCoalesce(
                            _optionalChain([
                              serverConfig,
                              'access',
                              (_10) => _10[key],
                              'access',
                              (_11) => _11.preview,
                              'optionalAccess',
                              (_12) => _12.content,
                            ]),
                            () => 'same'
                          ),
                        },
                        ...serverConfig[key].list[routeKey].pointsTo,
                      },
              }
            } else if (serverConfig[key].list[routeKey].preview) {
              serverConfig[key].list[routeKey] = {
                preview:
                  typeof serverConfig[key].list[routeKey].preview === 'boolean'
                    ? serverConfig[key].preview
                    : {
                        ...defaultPreview,
                        ...serverConfig[key].preview,
                        ...serverConfig[key][routeKey].preview,
                      },
              }
            }
          }
        }

        if (serverConfig[key].custom) {
          const customFunc = serverConfig[key].custom
          serverConfig[key].custom = (url) => {
            if (!url) return

            let tmpConfig = customFunc(url)

            const urlInfo = new URL(url)

            const defaultOptionOfCustom = _nullishCoalesce(
              _optionalChain([
                serverConfig,
                'access',
                (_13) => _13[key],
                'access',
                (_14) => _14.list,
                'optionalAccess',
                (_15) => _15[urlInfo.pathname],
              ]),
              () =>
                !!serverConfig[key].preview && {
                  preview: serverConfig[key].preview,
                }
            )

            if (!defaultOptionOfCustom) return

            if (!tmpConfig) {
              tmpConfig = defaultOptionOfCustom
            } else if (tmpConfig.pointsTo) {
              tmpConfig = {
                pointsTo:
                  typeof tmpConfig.pointsTo === 'string'
                    ? {
                        url: tmpConfig.pointsTo,
                        content: _nullishCoalesce(
                          _nullishCoalesce(
                            _optionalChain([
                              defaultOptionOfCustom,
                              'access',
                              (_16) => _16.pointsTo,
                              'optionalAccess',
                              (_17) => _17.content,
                            ]),
                            () =>
                              _optionalChain([
                                defaultOptionOfCustom,
                                'access',
                                (_18) => _18.preview,
                                'optionalAccess',
                                (_19) => _19.content,
                              ])
                          ),
                          () => 'same'
                        ),
                        time: _nullishCoalesce(
                          _optionalChain([
                            defaultOptionOfCustom,
                            'access',
                            (_20) => _20[key],
                            'access',
                            (_21) => _21.preview,
                            'optionalAccess',
                            (_22) => _22.time,
                          ]),
                          () => 'infinite'
                        ),
                        renewTime: _nullishCoalesce(
                          _optionalChain([
                            defaultOptionOfCustom,
                            'access',
                            (_23) => _23[key],
                            'access',
                            (_24) => _24.preview,
                            'optionalAccess',
                            (_25) => _25.renewTime,
                          ]),
                          () => 1800
                        ),
                      }
                    : {
                        ...{
                          content: _nullishCoalesce(
                            _nullishCoalesce(
                              _optionalChain([
                                defaultOptionOfCustom,
                                'access',
                                (_26) => _26.pointsTo,
                                'optionalAccess',
                                (_27) => _27.content,
                              ]),
                              () =>
                                _optionalChain([
                                  defaultOptionOfCustom,
                                  'access',
                                  (_28) => _28.preview,
                                  'optionalAccess',
                                  (_29) => _29.content,
                                ])
                            ),
                            () => 'same'
                          ),
                          time: _nullishCoalesce(
                            _optionalChain([
                              defaultOptionOfCustom,
                              'access',
                              (_30) => _30[key],
                              'access',
                              (_31) => _31.preview,
                              'optionalAccess',
                              (_32) => _32.time,
                            ]),
                            () => 'infinite'
                          ),
                          renewTime: _nullishCoalesce(
                            _optionalChain([
                              defaultOptionOfCustom,
                              'access',
                              (_33) => _33[key],
                              'access',
                              (_34) => _34.preview,
                              'optionalAccess',
                              (_35) => _35.renewTime,
                            ]),
                            () => 1800
                          ),
                        },
                        ...tmpConfig.pointsTo,
                      },
              }
            } else if (tmpConfig.preview) {
              tmpConfig =
                typeof tmpConfig.preview === 'boolean'
                  ? {
                      preview: defaultOptionOfCustom.preview,
                    }
                  : {
                      preview: {
                        ...{
                          content: _nullishCoalesce(
                            _optionalChain([
                              defaultOptionOfCustom,
                              'access',
                              (_36) => _36.preview,
                              'optionalAccess',
                              (_37) => _37.content,
                            ]),
                            () => 'same'
                          ),
                        },
                        ...tmpConfig.preview,
                      },
                    }
            } else {
              tmpConfig = {
                ...defaultOptionOfCustom,
                ...tmpConfig,
              }
            }

            if (tmpConfig.loader) {
              tmpConfig.loader.enable =
                typeof tmpConfig.loader.enable === 'undefined'
                  ? true
                  : tmpConfig.loader.enable
              tmpConfig.loader.content =
                typeof tmpConfig.loader.content === 'undefined'
                  ? _nullishCoalesce(
                      _optionalChain([
                        tmpConfig.pointsTo || tmpConfig.preview,
                        'optionalAccess',
                        (_38) => _38.content,
                      ]),
                      () => 'same'
                    )
                  : tmpConfig.loader.content
            }

            return tmpConfig
          }
        }
      } else serverConfig[key] = _constants.defaultServerConfig[key]
    } // routes

    if (key === 'api') {
      if (options[key]) {
        const defaultOption = _constants.defaultServerConfig[key]
        serverConfig[key].list = {
          ...defaultOption.list,
          ...serverConfig[key].list,
        }

        for (const apiListKey in serverConfig[key].list) {
          if (typeof serverConfig[key].list[apiListKey] === 'string') {
            serverConfig[key].list[apiListKey] = {
              secretKey: serverConfig[key].list[apiListKey],
              headerSecretKeyName: 'Authorization',
            }

            continue
          }

          if (!serverConfig[key].list[apiListKey].headerSecretKeyName) {
            serverConfig[key].list[apiListKey].headerSecretKeyName =
              'Authorization'
          }
        }
      } else serverConfig[key] = _constants.defaultServerConfig[key]
    } // api
  }

  serverConfig.isRemoteCrawler =
    _InitEnv.PROCESS_ENV.IS_REMOTE_CRAWLER === undefined
      ? serverConfig.isRemoteCrawler === undefined
        ? _constants.defaultServerConfig.isRemoteCrawler
        : serverConfig.isRemoteCrawler
      : _InitEnv.PROCESS_ENV.IS_REMOTE_CRAWLER

  serverConfig.crawler = serverConfig.isRemoteCrawler
    ? ''
    : _InitEnv.ENV_MODE === 'development'
      ? serverConfig.crawler
      : _InitEnv.PROCESS_ENV.CRAWLER || serverConfig.crawler

  serverConfig.crawlerSecretKey = serverConfig.isRemoteCrawler
    ? ''
    : _InitEnv.ENV_MODE === 'development'
      ? serverConfig.crawlerSecretKey
      : _InitEnv.PROCESS_ENV.CRAWLER_SECRET_KEY || undefined

  return serverConfig
}
exports.defineServerConfig = defineServerConfig
