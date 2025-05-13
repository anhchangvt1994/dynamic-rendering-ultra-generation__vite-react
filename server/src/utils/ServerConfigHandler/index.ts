import { ENV_MODE, PROCESS_ENV } from '../InitEnv'
import { defaultServerConfig } from './constants'
import { IServerConfig, IServerConfigOptional } from './types'

export const defineServerConfig = (options: IServerConfigOptional) => {
  const serverConfig = { ...options } as IServerConfig

  for (const key in defaultServerConfig) {
    if (key === 'locale') {
      if (serverConfig[key]) {
        const defaultOption = defaultServerConfig[key]

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
          serverConfig[key].custom = (url: string) => {
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
      } else serverConfig[key] = defaultServerConfig[key]
    } // locale

    if (key === 'crawl') {
      if (options[key]) {
        const defaultOption = defaultServerConfig[key]

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
          serverConfig[key].custom = (url: string) => {
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
      } else serverConfig[key] = defaultServerConfig[key]
    } // crawl

    if (key === 'routes') {
      if (serverConfig[key]) {
        const defaultOption = defaultServerConfig[key]

        serverConfig[key] = {
          ...defaultOption,
          ...serverConfig[key],
        }

        const defaultPreview = {
          content: 'same',
          time: 300,
          renewTime: 120,
        } as IServerConfig['routes']['preview']

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
                        content: serverConfig[key].preview?.content ?? 'same',
                        time: serverConfig[key].preview?.time ?? 'infinite',
                        renewTime: serverConfig[key].preview?.renewTime ?? 1800,
                      }
                    : {
                        ...{
                          content: serverConfig[key].preview?.content ?? 'same',
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
          serverConfig[key].custom = (url: string) => {
            if (!url) return

            let tmpConfig = customFunc(url)

            const urlInfo = new URL(url)

            const defaultOptionOfCustom =
              serverConfig[key].list?.[urlInfo.pathname] ?? serverConfig[key]

            if (!tmpConfig) {
              tmpConfig = defaultOptionOfCustom
            } else if (tmpConfig.pointsTo) {
              tmpConfig = {
                pointsTo:
                  typeof tmpConfig.pointsTo === 'string'
                    ? {
                        url: tmpConfig.pointsTo,
                        content:
                          (defaultOptionOfCustom as any).pointsTo?.content ??
                          defaultOptionOfCustom.preview?.content ??
                          defaultOption.content,
                        time:
                          defaultOptionOfCustom[key].preview?.time ??
                          'infinite',
                        renewTime:
                          defaultOptionOfCustom[key].preview?.renewTime ?? 1800,
                      }
                    : {
                        ...{
                          content:
                            (defaultOptionOfCustom as any).pointsTo?.content ??
                            defaultOptionOfCustom.preview?.content ??
                            defaultOption.content,
                          time:
                            defaultOptionOfCustom[key].preview?.time ??
                            'infinite',
                          renewTime:
                            defaultOptionOfCustom[key].preview?.renewTime ??
                            1800,
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
                          content:
                            defaultOptionOfCustom.preview?.content ??
                            defaultOption.content,
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
              tmpConfig.loader.content = !tmpConfig.loader.content
                ? ((tmpConfig.pointsTo || tmpConfig.preview)?.content ?? 'same')
                : tmpConfig.loader.content
            }

            return tmpConfig
          }
        }
      } else serverConfig[key] = defaultServerConfig[key]
    } // routes

    if (key === 'api') {
      if (options[key]) {
        const defaultOption = defaultServerConfig[key]
        serverConfig[key].list = {
          ...defaultOption.list,
          ...serverConfig[key].list,
        }

        for (const apiListKey in serverConfig[key].list) {
          if (typeof serverConfig[key].list[apiListKey] === 'string') {
            serverConfig[key].list[apiListKey] = {
              secretKey: serverConfig[key].list[
                apiListKey
              ] as unknown as string,
              headerSecretKeyName: 'Authorization',
            }

            continue
          }

          if (!serverConfig[key].list[apiListKey].headerSecretKeyName) {
            serverConfig[key].list[apiListKey].headerSecretKeyName =
              'Authorization'
          }
        }
      } else serverConfig[key] = defaultServerConfig[key]
    } // api
  }

  serverConfig.isRemoteCrawler =
    PROCESS_ENV.IS_REMOTE_CRAWLER === undefined
      ? serverConfig.isRemoteCrawler === undefined
        ? defaultServerConfig.isRemoteCrawler
        : serverConfig.isRemoteCrawler
      : PROCESS_ENV.IS_REMOTE_CRAWLER

  serverConfig.crawler = serverConfig.isRemoteCrawler
    ? ''
    : ENV_MODE === 'development'
      ? serverConfig.crawler
      : PROCESS_ENV.CRAWLER || serverConfig.crawler

  serverConfig.crawlerSecretKey = serverConfig.isRemoteCrawler
    ? ''
    : ENV_MODE === 'development'
      ? serverConfig.crawlerSecretKey
      : PROCESS_ENV.CRAWLER_SECRET_KEY || undefined

  return serverConfig as IServerConfig
}
