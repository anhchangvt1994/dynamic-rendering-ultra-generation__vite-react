"use strict";Object.defineProperty(exports, "__esModule", {value: true});var _ServerConfigHandler = require('./utils/ServerConfigHandler');

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
      if (!url || url.includes('login')) return

      const urlInfo = new URL(url)
      const pathSlitted = urlInfo.pathname.trim().split('/')

      if (pathSlitted.length <= 2 && pathSlitted[0] === '') {
        return {
          loader: {
            name: 'home-page',
          },
        }
      }
    },
  },
  api: {
    list: {
      'https://api.example.com': {
        headers: {},
        body: {},
      },
    },
  },
})

exports. default = ServerConfig
