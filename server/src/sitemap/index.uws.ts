import fs from 'fs'
import path from 'path'
import { TemplatedApp } from 'uWebSockets.js'
import { brotliCompressSync, gzipSync } from 'zlib'
import Console from '../utils/ConsoleHandler'

const SitemapRouter = (() => {
  let _app: TemplatedApp

  const _allRequestHandler = () => {
    /**
     * make get sitemap.xml
     */
    _app.get('/sitemap.xml', async (res, req) => {
      res.onAborted(() => {
        res.writableEnded = true
        Console.log('Request aborted')
      })

      try {
        const url = req.getUrl()

        // Determine content encoding based on client's Accept-Encoding header
        const contentEncoding = (() => {
          const tmpHeaderAcceptEncoding = req.getHeader('accept-encoding') || ''
          if (tmpHeaderAcceptEncoding.indexOf('br') !== -1) return 'br'
          else if (tmpHeaderAcceptEncoding.indexOf('gzip') !== -1) return 'gzip'
          return '' as 'br' | 'gzip' | ''
        })()

        // Read original file
        const filePath = path.resolve(__dirname, `../../sitemap/${url}`)
        Console.log('Sitemap filePath:', filePath)
        Console.log('File exists:', fs.existsSync(filePath))
        const originalContent = fs.readFileSync(filePath, 'utf-8')

        // Compress content based on client's supported encoding
        const result = (() => {
          switch (true) {
            case contentEncoding === 'br':
              return brotliCompressSync(originalContent)
            case contentEncoding === 'gzip':
              return gzipSync(originalContent)
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
        Console.error('Error reading sitemap:', error)
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
        Console.log('Request aborted')
      })

      try {
        const url = req.getUrl()

        // Determine content encoding based on client's Accept-Encoding header
        const contentEncoding = (() => {
          const tmpHeaderAcceptEncoding = req.getHeader('accept-encoding') || ''
          if (tmpHeaderAcceptEncoding.indexOf('br') !== -1) return 'br'
          else if (tmpHeaderAcceptEncoding.indexOf('gzip') !== -1) return 'gzip'
          return '' as 'br' | 'gzip' | ''
        })()

        // Read original file
        const filePath = path.resolve(__dirname, `../../sitemap/${url}`)
        Console.log('Sitemap filePath:', filePath)
        Console.log('File exists:', fs.existsSync(filePath))
        const originalContent = fs.readFileSync(filePath, 'utf-8')

        // Compress content based on client's supported encoding
        const result = (() => {
          switch (true) {
            case contentEncoding === 'br':
              return brotliCompressSync(originalContent)
            case contentEncoding === 'gzip':
              return gzipSync(originalContent)
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
        Console.error('Error reading sitemap:', error)
        res.cork(() => {
          res.writeStatus('404').end('Sitemap not found')
        })
      }
    })
  }

  return {
    init(app: TemplatedApp) {
      if (!app) return Console.warn('You need provide uWebSockets app!')

      _app = app
      _allRequestHandler()
    },
  }
})()

export default SitemapRouter
