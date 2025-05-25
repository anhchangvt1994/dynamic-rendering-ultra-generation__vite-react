'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
var _ServerConfigHandler = require('./utils/ServerConfigHandler')

const ServerConfig = _ServerConfigHandler.defineServerConfig.call(void 0, {
  crawl: {
    enable: true,
    optimize: 'deep',
    routes: {
      '/login': {
        enable: false,
      },
    },
  },
  routes: {
    content: 'all',
    custom(url) {
      if (!url) return

      const urlInfo = new URL(url)
      const pathSlitted = urlInfo.pathname.trim().split('/')

      if (pathSlitted.length === 3 && pathSlitted[2]) {
        return {
          loader: {
            name: 'content-page-width-comment',
          },
        }
      }
      if (pathSlitted.length === 2 && pathSlitted[1]) {
        return {
          loader: {
            name: 'content-page',
          },
        }
      }
    },
  },
})

exports.default = ServerConfig
