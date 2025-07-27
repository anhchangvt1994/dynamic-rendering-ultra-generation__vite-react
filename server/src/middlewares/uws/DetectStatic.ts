import fs from 'fs'
import mime from 'mime-types'
import path from 'path'
import { HttpRequest, HttpResponse } from 'uWebSockets.js'
import { brotliCompress, gzip, constants as zc } from 'zlib'
import ServerConfig from '../../server.config'
import Console from '../../utils/ConsoleHandler'
import detectStaticExtension from '../../utils/DetectStaticExtension.uws'
import { ENV } from '../../utils/InitEnv'
// import optimizeImage from '../../utils/OptimizeImage'

const DetectStaticMiddle = (res: HttpResponse, req: HttpRequest) => {
  const isStatic = detectStaticExtension(req)
  /**
   * NOTE
   * Cache-Control max-age is 1 year
   * calc by using:
   * https://www.inchcalculator.com/convert/month-to-second/
   */

  if (isStatic && !ServerConfig.isRemoteCrawler) {
    const staticPath = fs.existsSync(
      path.resolve(__dirname, `../../../resources/${req.getUrl()}`)
    )
      ? path.resolve(__dirname, `../../../resources/${req.getUrl()}`)
      : path.resolve(__dirname, `../../../../dist/${req.getUrl()}`)

    try {
      if (ENV === 'development') {
        let body
        try {
          body = fs.readFileSync(staticPath)
        } catch (err) {
          Console.error(err)
        }
        const mimeType = mime.lookup(staticPath)
        res
          .writeStatus('200')
          .writeHeader('Cache-Control', 'public, max-age=31556952')
          .writeHeader('Content-Type', mimeType as string)
          .end(body, true)
      } else {
        const mimeType = mime.lookup(staticPath)

        const enableContentEncoding = ['text/javascript', 'text/css'].includes(
          mimeType as string
        )
        const contentEncoding = (() => {
          if (!enableContentEncoding) return ''

          const tmpHeaderAcceptEncoding = req.getHeader('accept-encoding') || ''
          if (tmpHeaderAcceptEncoding.indexOf('br') !== -1) return 'br'
          else if (tmpHeaderAcceptEncoding.indexOf('gzip') !== -1) return 'gzip'
          return '' as 'br' | 'gzip' | ''
        })()
        const enableCache = !enableContentEncoding || contentEncoding
        let isContentEncodingAvailable = false

        const body = (() => {
          if (enableContentEncoding) {
            const staticContentEncodingPath = staticPath
              .replace('/dist', '/server/resources')
              .replace(/.js|.css/, `.${contentEncoding}`)

            if (fs.existsSync(staticContentEncodingPath)) {
              try {
                const content = fs.readFileSync(staticContentEncodingPath)
                isContentEncodingAvailable = true
                return content
              } catch (err) {
                Console.error(err)
                return ''
              }
            } else {
              try {
                const content = fs.readFileSync(staticPath)

                if (contentEncoding === 'br') {
                  brotliCompress(
                    content,
                    {
                      params: {
                        [zc.BROTLI_PARAM_QUALITY]: zc.Z_BEST_COMPRESSION,
                      },
                    },
                    (err, result) => {
                      if (err) Console.error(err)
                      else {
                        fs.writeFile(
                          staticContentEncodingPath,
                          result,
                          (err) => {
                            if (err) Console.error(err)
                          }
                        )
                      }
                    }
                  )
                } else if (contentEncoding === 'gzip') {
                  gzip(
                    content,
                    {
                      level: zc.Z_BEST_COMPRESSION,
                    },
                    (err, result) => {
                      if (err) Console.error(err)
                      else {
                        fs.writeFile(
                          staticContentEncodingPath,
                          result,
                          (err) => {
                            if (err) Console.error(err)
                          }
                        )
                      }
                    }
                  )
                }

                return content
              } catch (err) {
                Console.error(err)
                return ''
              }
            }
          } else {
            try {
              // if (
              //   IMAGE_MIME_TYPE_LIST_WITHOUT_SVG.includes(mimeType as string)
              // ) {
              //   optimizeImage(staticPath)
              //     .then((result) => {
              //       if (result) {
              //         console.log(result)
              //       }
              //     })
              //     .catch((err) => {
              //       console.error(`Error optimizing image: ${staticPath}`, err)
              //     })
              // }
              const content = fs.readFileSync(staticPath)
              return content
            } catch (err) {
              Console.error(err)
              return ''
            }
          }
        })()

        res.writeStatus('200')

        if (enableCache) {
          res.writeHeader('Cache-Control', 'public, max-age=31556952')
        }
        if (enableContentEncoding && isContentEncodingAvailable) {
          res.writeHeader('Content-Encoding', contentEncoding as string)
        }

        res.writeHeader('Content-Type', mimeType as string).end(body, true)
      }
    } catch (err) {
      res.writeStatus('404').end('File not found', true)
    }

    res.writableEnded = true
  }
}

export default DetectStaticMiddle
