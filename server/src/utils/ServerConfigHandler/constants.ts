import { IServerConfig } from './types'

export const defaultServerConfig: IServerConfig = {
  locale: {
    enable: false,
    hideDefaultLocale: false,
    routes: {},
  },
  isRemoteCrawler: false,
  crawl: {
    enable: true,
    limit: 3,
    speed: 3000,
    content: 'same',
    cache: {
      enable: true,
      time: 4 * 3600, // 4 hours (second unit)
      renewTime: 3 * 60, // 3 minutes (second unit)
    },
    compress: true,
    optimize: ['script'],
    routes: {},
  },
  routes: {
    content: 'same',
  },
  api: {
    list: {},
  },
}
