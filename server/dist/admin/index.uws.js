"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _http = require('http'); var _http2 = _interopRequireDefault(_http);






var _ConsoleHandler = require('../utils/ConsoleHandler'); var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler);

// Strapi paths that should be proxied
const STRAPI_PATHS = [
  '/admin',
  '/content-manager',
  '/content-type-builder',
  '/upload',
  '/i18n',
  '/content-releases',
  '/strapi', // Maps to /api on Strapi
  '/users-permissions',
  '/_health',
]

// Check if a URL path should be proxied to Strapi
 const shouldProxyToStrapi = (urlPath) => {
  return STRAPI_PATHS.some(
    (prefix) => urlPath === prefix || urlPath.startsWith(prefix + '/')
  )
}; exports.shouldProxyToStrapi = shouldProxyToStrapi

// Proxy handler for Strapi
 const proxyToStrapi = (res, req) => {
  res.onAborted(() => {
    ;(res ).aborted = true
  })

  const method = req.getMethod().toUpperCase()
  let url = req.getUrl()

  // Rewrite /strapi/* to /api/* for Strapi server
  if (url === '/strapi' || url.startsWith('/strapi/')) {
    url = url.replace(/^\/strapi/, '/api')
  }

  const query = req.getQuery()
  const fullPath = query ? `${url}?${query}` : url

  // Collect headers from the original request
  const headers = {}
  req.forEach((key, value) => {
    headers[key] = value
  })
  headers['host'] = 'localhost:1337'

  // Read request body for POST/PUT/PATCH requests
  let body = []

  const makeProxyRequest = (bodyData) => {
    if ((res ).aborted) return

    const proxyOptions = {
      hostname: 'localhost',
      port: 1337,
      path: fullPath,
      method: method,
      headers: {
        ...headers,
        ...(bodyData ? { 'content-length': bodyData.length.toString() } : {}),
      },
    }

    const proxyReq = _http2.default.request(proxyOptions, (proxyRes) => {
      if ((res ).aborted) return

      const statusCode = proxyRes.statusCode || 200
      const statusMessage = proxyRes.statusMessage || ''

      // Collect response chunks
      const chunks = []
      proxyRes.on('data', (chunk) => {
        chunks.push(chunk)
      })

      proxyRes.on('end', () => {
        if ((res ).aborted) return
        const responseBody = Buffer.concat(chunks)
        res.cork(() => {
          // Set response status
          res.writeStatus(`${statusCode} ${statusMessage}`)

          // Copy response headers
          for (const [key, value] of Object.entries(proxyRes.headers)) {
            if (value && key.toLowerCase() !== 'transfer-encoding') {
              res.writeHeader(
                key,
                Array.isArray(value) ? value.join(', ') : value
              )
            }
          }

          res.end(responseBody)
        })
      })

      proxyRes.on('error', (err) => {
        _ConsoleHandler2.default.error('Proxy response error:', err)
        if (!(res ).aborted) {
          res.cork(() => {
            res.writeStatus('502 Bad Gateway')
            res.end('Proxy error')
          })
        }
      })
    })

    proxyReq.on('error', (err) => {
      _ConsoleHandler2.default.error('Proxy request error:', err)
      if (!(res ).aborted) {
        res.cork(() => {
          res.writeStatus('502 Bad Gateway')
          res.end('Could not connect to Strapi server')
        })
      }
    })

    if (bodyData) {
      proxyReq.write(bodyData)
    }
    proxyReq.end()
  }

  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    res.onData((chunk, isLast) => {
      body.push(Buffer.from(chunk))
      if (isLast) {
        makeProxyRequest(Buffer.concat(body))
      }
    })
  } else {
    makeProxyRequest()
  }
}; exports.proxyToStrapi = proxyToStrapi

const strapiProxyService = (async () => {
  let _app






  const _registerRoutes = () => {
    // Register routes for all Strapi paths
    for (const path of STRAPI_PATHS) {
      _app.all(path, exports.proxyToStrapi)
      _app.all(`${path}/*`, exports.proxyToStrapi)
    }
  }

  return {
    init(app) {
      if (!app) return _ConsoleHandler2.default.warn('You need to provide uWebSockets app!')
      _app = {
        all: (pattern, handler) => {
          app.get(pattern, handler)
          app.post(pattern, handler)
          app.put(pattern, handler)
          app.patch(pattern, handler)
          app.del(pattern, handler)
        },
      }
      _registerRoutes()
    },
  }
})()

exports. default = strapiProxyService
