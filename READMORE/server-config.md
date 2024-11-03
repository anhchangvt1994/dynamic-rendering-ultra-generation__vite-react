[< Back](../README.md)

## How to config server ?

You can config some behavior for server to match with your necessary, to do it, just open the <b>server/server.config.ts</b> file and config into it.

```typescript
import { defineServerConfig } from './utils/ServerConfigHandler'

const ServerConfig = defineServerConfig({
  /* optional - default '/tmp' */
  // root cache directory of page, store, data
  rootCache: '/tmp'

  /* optional - default enable : false */
  locale: {
    /* required */
    enable: true, // enable use /:locale dispatcher param

    /* optional */
    defaultLang: 'en', // default language for website

    /* optional */
    defaultCountry: 'us', // default country for website (set it empty if you just use language)

    /* optional */
    routes: {
      '/login': {
        /* required */
        enable: false // disable use /:locale dispatcher param
      }
    }

    /* optional */
    custom: (url) {
      // condition base on url and return { enable: boolean } - default enable: false
      ...
    }
  },

  /* optional - default enable : true */
  crawl: {
    /* required */
    enable: true, // enable to crawl

    /* optional */
    limit: 3, // rate limit crawler per time
    // default 3
    // valid values:  2, 3 or 4

    /* optional */
    speed: 3000, // speed to crawl an url, this value is just average number, in fact will slow or fast than 2x.
    // default 3000ms
    // The valid values: 3000, 8000 or 15000

    /* optional */
    content: ['desktop', 'mobile'] // what content device you need to crawl, if just set desktop, the crawler and cache just crawl and cache the desktop content.
    // default ['desktop', 'mobile']
    // valid values: 'all', Array<'desktop' | 'mobile'>

    /* optional */
    optimize: ['script'], // what level of optimization to use for crawled content. default is script
    /**
     * script: remove script,
     * style: remove style,
     * low: remove script, style, div, class
     * shallow: remove script, style, div, class, form, image
     * deep: remove script, style, div, class, form, image, and handle accessibility
    */
   // default ['script']
   // valid values: 'low', 'shallow', 'deep', Array<'script' | 'style'>

    /* optional */
    compress: true, // enable to compress HTML content

    /* optional */
    cache: {
      /* required */
      enable: true, // enable to cache after crawl success
      /* optional */
      time: 4 * 3600, // cache will be cleared after 4 hours
      /* optional */
      renewTime: 3 * 60, // cache need to be renewed if current time - update time > 3 minutes
    },

    /* optional */
    routes: {
      '/list': {
        /* required */
        enable: true, // enable to cache after crawl success
        /* optional */
        time: 4 * 3600, // cache will be cleared after 4 hours
      },
      ...
    },

    /* optional */
    custom: (url) {
      // condition base on url and return { enable: boolean } - default enable: true
      // option onContentCrawled is a callback function in return, use it if you need custom more of html result
      ...
    }
  },

  /* optional */
  routes: {
    '/': {
      /* optional */
      pointsTo: 'https://points-to-url.com' // this means if path is '/' just crawl 'https://points-to-url.com' content
    }
  }

  /* optional */
  crawler: 'http://localhost:8084', // setup remote crawler
  /* optional */
  crawlerSecretKey: '***' // setup remote crawler secret key to access

  /* optional */
  api: {
    list: {
      /* this mean, the base url 'http://localhost:3000/api'
      will have
        - the 'secretKey' is 'xxx'
        - the 'headerSecretKeyName' is 'API-Key'
      */
      'http://example-first/api': {
        secretKey: 'xxx'
        headerSecretKeyName: 'API-Key'
      },

      /* this mean, the base url 'http://localhost:3001/api'
      will have
        - the 'secretKey' is 'abc'
        - the 'headerSecretKeyName' is 'Authorization'
        as default
      */
      'http://example-second/api': 'abc'
    }
  }
})

export default ServerConfig
```
