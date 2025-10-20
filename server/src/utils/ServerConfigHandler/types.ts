import { IRequestBodyOptional, IRequestHeadersOptional } from '../../types'

export interface IServerConfigOptional {
  rootCache?: string
  isRemoteCrawler?: boolean

  locale?: {
    enable: boolean
    defaultLang?: string | undefined
    defaultCountry?: string | undefined
    hideDefaultLocale?: boolean

    routes?: {
      [key: string]: Omit<
        NonNullable<IServerConfigOptional['locale']>,
        'enable' | 'routes' | 'custom'
      > & {
        enable?: boolean
      }
    }

    custom?: (url: string) =>
      | (Omit<
          NonNullable<IServerConfigOptional['locale']>,
          'enable' | 'routes' | 'custom'
        > & {
          enable?: boolean
        })
      | void
  }

  crawl?: {
    enable: boolean

    limit?: 2 | 3 | 4

    speed?: 3000 | 8000 | 15000 | 20000 | 30000 | 40000 | 50000 | 60000

    content?: 'all' | 'same' | Array<'desktop' | 'mobile'>

    optimize?: 'low' | 'shallow' | 'deep' | Array<'script' | 'style'>

    compress?: boolean

    cache?: {
      enable: boolean
      time?: number | 'infinite'
      renewTime?: number | 'infinite'
    }

    routes?: {
      [key: string]: Omit<
        NonNullable<IServerConfigOptional['crawl']>,
        'enable' | 'routes' | 'custom' | 'cache' | 'content' | 'limit'
      > & {
        enable?: boolean
        cache?: Omit<
          NonNullable<NonNullable<IServerConfigOptional['crawl']>['cache']>,
          'enable' | 'path'
        > & {
          enable?: boolean
        }
      }
    }

    custom?: (url: string) =>
      | (Omit<
          NonNullable<IServerConfigOptional['crawl']>,
          'enable' | 'routes' | 'custom' | 'cache' | 'content' | 'limit'
        > & {
          enable?: boolean
          cache?: Omit<
            NonNullable<NonNullable<IServerConfigOptional['crawl']>>['cache'],
            'path'
          >
          onContentCrawled?: (payload: { html: string }) => string | void
        })
      | undefined
  }

  routes?: {
    content?: 'all' | 'same' | Array<'desktop' | 'mobile'>
    // preview?:
    //   | boolean
    //   | {
    //       content?: 'all' | 'same' | Array<'desktop' | 'mobile'>
    //       time: number | 'infinite'
    //       renewTime: number | 'infinite'
    //     }
    list?: {
      [key: string]: {
        pointsTo?:
          | string
          | {
              url: string
              content?: 'all' | 'same' | Array<'desktop' | 'mobile'>
              time?: number | 'infinite'
              renewTime?: number | 'infinite'
            }
        loader?: {
          enable?: boolean
          name: string
          content?: 'all' | 'same' | Array<'desktop' | 'mobile'>
        }
      } & Omit<
        NonNullable<IServerConfigOptional['routes']>,
        'list' | 'custom' | 'content'
      >
    }
    custom?: (url: string) =>
      | ({
          pointsTo?:
            | string
            | {
                url: string
                content?: 'all' | 'same' | Array<'desktop' | 'mobile'>
                time?: number | 'infinite'
                renewTime?: number | 'infinite'
              }
          loader?: {
            enable?: boolean
            name: string
            content?: 'all' | 'same' | Array<'desktop' | 'mobile'>
          }
        } & Omit<
          NonNullable<IServerConfigOptional['routes']>,
          'list' | 'custom' | 'content'
        >)
      | undefined
      | void
  }

  crawler?: string
  crawlerSecretKey?: string

  api?: {
    secretKey?:
      | ('DeviceInfo.type' | 'DeviceInfo.os' | 'LocaleInfo.country')[]
      | string
    list?: {
      [key: string]: {
        headers?: IRequestHeadersOptional
        body?: IRequestBodyOptional
      }
    }
  }
}

export interface IServerConfig extends IServerConfigOptional {
  rootCache?: string
  isRemoteCrawler: boolean

  locale: {
    enable: boolean
    defaultLang?: string | undefined
    defaultCountry?: string | undefined
    hideDefaultLocale?: boolean

    routes: {
      [key: string]: Omit<
        NonNullable<IServerConfig['locale']>,
        'routes' | 'custom'
      >
    }

    custom?: (url: string) =>
      | (Omit<
          NonNullable<IServerConfig['locale']>,
          'enable' | 'routes' | 'custom'
        > & {
          enable?: boolean
        })
      | undefined
  }

  crawl: {
    enable: boolean

    limit: 2 | 3 | 4

    speed: 3000 | 8000 | 15000 | 20000 | 30000 | 40000 | 50000 | 60000

    content: 'all' | 'same' | Array<'desktop' | 'mobile'>

    optimize: 'low' | 'shallow' | 'deep' | Array<'script' | 'style'>

    compress: boolean

    cache: {
      enable: boolean
      time: number | 'infinite'
      renewTime: number | 'infinite'
    }

    routes: {
      [key: string]: Omit<
        IServerConfig['crawl'],
        'routes' | 'custom' | 'cache' | 'content' | 'limit'
      > & {
        cache: Omit<IServerConfig['crawl']['cache'], 'path'>
      }
    }

    custom?: (url: string) =>
      | (Omit<
          IServerConfig['crawl'],
          'routes' | 'custom' | 'cache' | 'content' | 'limit'
        > & {
          cache: Omit<IServerConfig['crawl']['cache'], 'path'>
          onContentCrawled?: (payload: { html: string }) => string | void
        })
      | undefined
  }

  routes: {
    content: 'all' | 'same' | Array<'desktop' | 'mobile'>
    preview?: {
      content: 'all' | 'same' | Array<'desktop' | 'mobile'>
      time: number | 'infinite'
      renewTime: number | 'infinite'
    }
    list?: {
      [key: string]: {
        pointsTo?: {
          url: string
          content: 'all' | 'same' | Array<'desktop' | 'mobile'>
          time: number | 'infinite'
          renewTime: number | 'infinite'
        }
        loader?: {
          enable: boolean
          name: string
          content: 'all' | 'same' | Array<'desktop' | 'mobile'>
        }
      } & Omit<IServerConfig['routes'], 'list' | 'custom' | 'content'>
    }
    custom?: (url: string) =>
      | ({
          pointsTo?: {
            url: string
            content: 'all' | 'same' | Array<'desktop' | 'mobile'>
            time: number | 'infinite'
            renewTime: number | 'infinite'
          }
          loader?: {
            enable: boolean
            name: string
            content: 'all' | 'same' | Array<'desktop' | 'mobile'>
          }
        } & Omit<IServerConfig['routes'], 'list' | 'custom' | 'content'>)
      | undefined
  }

  api: {
    list: {
      [key: string]: {
        headers?: IRequestHeadersOptional
        body?: IRequestBodyOptional
      }
    }
  }
}
