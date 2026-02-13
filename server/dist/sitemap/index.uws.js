"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _fs = require('fs'); var _fs2 = _interopRequireDefault(_fs);
var _path = require('path'); var _path2 = _interopRequireDefault(_path);

var _zlib = require('zlib');
var _ConsoleHandler = require('../utils/ConsoleHandler'); var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler);

const SitemapRouter = (() => {
  let _app

  const _allRequestHandler = () => {
    /**
     * make get sitemap.xml
     */
    _app.get('/sitemap.xml', async (res, req) => {
      res.onAborted(() => {
        res.writableEnded = true
        _ConsoleHandler2.default.log('Request aborted')
      })

      try {
        const url = req.getUrl()

        // Determine content encoding based on client's Accept-Encoding header
        const contentEncoding = (() => {
          const tmpHeaderAcceptEncoding = req.getHeader('accept-encoding') || ''
          if (tmpHeaderAcceptEncoding.indexOf('br') !== -1) return 'br'
          else if (tmpHeaderAcceptEncoding.indexOf('gzip') !== -1) return 'gzip'
          return '' 
        })()

        // Read original file
        const filePath = _path2.default.resolve(__dirname, `../../sitemap/${url}`)
        _ConsoleHandler2.default.log('Sitemap filePath:', filePath)
        _ConsoleHandler2.default.log('File exists:', _fs2.default.existsSync(filePath))
        const originalContent = _fs2.default.readFileSync(filePath, 'utf-8')

        // Compress content based on client's supported encoding
        const result = (() => {
          switch (true) {
            case contentEncoding === 'br':
              return _zlib.brotliCompressSync.call(void 0, originalContent)
            case contentEncoding === 'gzip':
              return _zlib.gzipSync.call(void 0, originalContent)
            default:
              return originalContent
          }
        })()

        res.cork(() => {
          if (contentEncoding) {
            res.writeHeader('Content-Encoding', contentEncoding)
          }
          res.writeHeader('Content-Type', 'application/xml')
          res.writeStatus('200').end(result)
        })
      } catch (error) {
        _ConsoleHandler2.default.error('Error reading sitemap:', error)
        res.cork(() => {
          res.writeStatus('404').end('Sitemap not found')
        })
      }
    })

    /**
     * make get sitemaps/*.xml
     */
    _app.get('/sitemaps/*', async (res, req) => {
      res.onAborted(() => {
        res.writableEnded = true
        _ConsoleHandler2.default.log('Request aborted')
      })

      try {
        const url = req.getUrl()

        // Determine content encoding based on client's Accept-Encoding header
        const contentEncoding = (() => {
          const tmpHeaderAcceptEncoding = req.getHeader('accept-encoding') || ''
          if (tmpHeaderAcceptEncoding.indexOf('br') !== -1) return 'br'
          else if (tmpHeaderAcceptEncoding.indexOf('gzip') !== -1) return 'gzip'
          return '' 
        })()

        // Read original file
        const filePath = _path2.default.resolve(__dirname, `../../sitemap/${url}`)
        _ConsoleHandler2.default.log('Sitemap filePath:', filePath)
        _ConsoleHandler2.default.log('File exists:', _fs2.default.existsSync(filePath))
        const originalContent = _fs2.default.readFileSync(filePath, 'utf-8')

        // Compress content based on client's supported encoding
        const result = (() => {
          switch (true) {
            case contentEncoding === 'br':
              return _zlib.brotliCompressSync.call(void 0, originalContent)
            case contentEncoding === 'gzip':
              return _zlib.gzipSync.call(void 0, originalContent)
            default:
              return originalContent
          }
        })()

        res.cork(() => {
          if (contentEncoding) {
            res.writeHeader('Content-Encoding', contentEncoding)
          }
          res.writeHeader('Content-Type', 'application/xml')
          res.writeStatus('200').end(result)
        })
      } catch (error) {
        _ConsoleHandler2.default.error('Error reading sitemap:', error)
        res.cork(() => {
          res.writeStatus('404').end('Sitemap not found')
        })
      }
    })
  }

  return {
    init(app) {
      if (!app) return _ConsoleHandler2.default.warn('You need provide uWebSockets app!')

      _app = app
      _allRequestHandler()
    },
  }
})()

exports. default = SitemapRouter
