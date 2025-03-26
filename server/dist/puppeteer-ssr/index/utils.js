'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj }
}
var _fs = require('fs')
var _fs2 = _interopRequireDefault(_fs)
var _zlib = require('zlib')
var _constants = require('../constants')

var _ConsoleHandler = require('../../utils/ConsoleHandler')
var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler)

const handleResultAfterISRGenerator = (res, next, params) => {
  if (!res || !next) return
  const { result, enableContentEncoding, contentEncoding } = params

  if (result) {
    /**
     * NOTE
     * calc by using:
     * https://www.inchcalculator.com/convert/year-to-second/
     */
    res.set({
      'Server-Timing': `Prerender;dur=50;desc="Headless render time (ms)"`,
      // 'Cache-Control': 'public, max-age: 31556952',
      'Cache-Control': 'no-store',
    })

    res.status(result.status)

    if (enableContentEncoding && result.status === 200) {
      res.set({
        'Content-Encoding': contentEncoding,
      })
    }

    if (result.status === 503) res.set('Retry-After', '120')
  } else {
    next(new Error('504 Gateway Timeout'))
    return
  }

  if (
    (_constants.CACHEABLE_STATUS_CODE[result.status] ||
      result.status === 503) &&
    result.response
  ) {
    const body = (() => {
      let tmpBody = ''

      if (enableContentEncoding) {
        tmpBody = result.html
          ? contentEncoding === 'br'
            ? _zlib.brotliCompressSync.call(void 0, result.html)
            : contentEncoding === 'gzip'
              ? _zlib.gzipSync.call(void 0, result.html)
              : result.html
          : (() => {
              let tmpContent = ''

              try {
                tmpContent = _fs2.default.readFileSync(result.response)
              } catch (err) {
                _ConsoleHandler2.default.error(err)
              }

              if (contentEncoding === 'br') return tmpContent
              else if (tmpContent && Buffer.isBuffer(tmpContent))
                tmpContent = _zlib.brotliDecompressSync
                  .call(void 0, tmpContent)
                  .toString()

              if (result.status === 200) {
                if (contentEncoding === 'gzip')
                  tmpContent = _zlib.gzipSync.call(void 0, tmpContent)
              }

              return tmpContent
            })()
      } else if (result.response.indexOf('.br') !== -1) {
        let content

        try {
          content = _fs2.default.readFileSync(result.response)
        } catch (err) {
          _ConsoleHandler2.default.error(err)
        }

        if (content && Buffer.isBuffer(content))
          tmpBody = _zlib.brotliDecompressSync.call(void 0, content).toString()
      } else {
        try {
          tmpBody = _fs2.default.readFileSync(result.response)
        } catch (err) {
          _ConsoleHandler2.default.error(err)
        }
      }

      return tmpBody
    })()

    res.send(body)
  }
  // Serve prerendered page as response.
  else {
    const body = (() => {
      let tmpBody
      if (enableContentEncoding) {
        try {
          tmpBody = result.html
            ? contentEncoding === 'br'
              ? _zlib.brotliCompressSync.call(void 0, result.html)
              : contentEncoding === 'gzip'
                ? _zlib.gzipSync.call(void 0, result.html)
                : result.html
            : _fs2.default.readFileSync(result.response)
        } catch (err) {
          _ConsoleHandler2.default.error(err)
        }
      }

      tmpBody = result.html || `${result.status} Error`

      return tmpBody
    })()
    res.status(result.status).send(body) // Serve prerendered page as response.
  }
}
exports.handleResultAfterISRGenerator = handleResultAfterISRGenerator // handleResultAfterISRGenerator
