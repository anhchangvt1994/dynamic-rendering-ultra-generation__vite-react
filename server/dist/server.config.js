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
      } else if (pathSlitted.length === 3 && pathSlitted[1] === 'pokemon') {
        return {
          loader: {
            name: 'pokemon-page',
          },
        }
      }
    },
  },
  api: {
    list: {
      'https://anhchangvt1994.com/strapi': {
        headers: {
          authorization:
            'Bearer c1951c660728c656f71290bbfb650a092901ecb7f0be5aec61510a264b5e19cd9d39ce629250a0fc80c51de8585e54881c738d93f9dc9abdc48e8268ce9743452b2fac9fe8ca4141b9c9a00f9be6813f3082468284076a1b07386655f936089a88cd0afde66cbb30f7e9b4f130bdf245bae79508181551afcbd34d24605ce67c',
        },
      },
    },
  },
})

exports. default = ServerConfig
