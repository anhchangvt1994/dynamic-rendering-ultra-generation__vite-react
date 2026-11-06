import { defineServerConfig } from './utils/ServerConfigHandler'

const ServerConfig = defineServerConfig({
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

      if (pathSlitted[1] === 'pokemon')
        return {
          loader: {
            name: 'pokemon-page',
          },
        }
      else if (
        pathSlitted[1] === 'whos-that-pokemon' ||
        pathSlitted[1] === 'ai-day'
      )
        return {
          loader: {
            name: 'whos-that-pokemon-page',
          },
        }
      else if (pathSlitted[1] === 'tui-do')
        return {
          loader: {
            name: 'tui-do-page',
          },
        }
      else if (pathSlitted[1] === 'che-bien')
        return {
          loader: {
            name: 'che-bien-page',
          },
        }
      else if (pathSlitted[1] === 'pokemon-cua-toi')
        return {
          loader: {
            name: 'pokemon-cua-toi-page',
          },
        }
      else if (pathSlitted[1] === 'so-sanh')
        return {
          loader: {
            name: 'so-sanh-page',
          },
        }
      else if (pathSlitted[1] === 'dang-nhap')
        return {
          loader: {
            name: 'dang-nhap-page',
          },
        }
      else if (pathSlitted[1] === 'blogs') {
        if (pathSlitted[2])
          return {
            loader: {
              name: 'blog-detail-page',
            },
          }
        else
          return {
            loader: {
              name: 'blog-page',
            },
          }
      } else if (
        // NOTE - "/" splits into ['', '']: [0] is empty for every path
        !pathSlitted[1]
      )
        return {
          loader: {
            name: 'home-page',
          },
        }
    },
  },
  api: {
    list: {},
  },
})

export default ServerConfig
