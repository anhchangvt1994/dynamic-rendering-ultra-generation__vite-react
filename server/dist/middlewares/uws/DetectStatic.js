"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _fs = require('fs'); var _fs2 = _interopRequireDefault(_fs);
var _mimetypes = require('mime-types'); var _mimetypes2 = _interopRequireDefault(_mimetypes);
var _path = require('path'); var _path2 = _interopRequireDefault(_path);

var _zlib = require('zlib');
var _serverconfig = require('../../server.config'); var _serverconfig2 = _interopRequireDefault(_serverconfig);
var _ConsoleHandler = require('../../utils/ConsoleHandler'); var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler);
var _DetectStaticExtensionuws = require('../../utils/DetectStaticExtension.uws'); var _DetectStaticExtensionuws2 = _interopRequireDefault(_DetectStaticExtensionuws);
var _InitEnv = require('../../utils/InitEnv');

const DetectStaticMiddle = (res, req) => {
  const isStatic = _DetectStaticExtensionuws2.default.call(void 0, req)
  /**
   * NOTE
   * Cache-Control max-age is 1 year
   * calc by using:
   * https://www.inchcalculator.com/convert/month-to-second/
   */

  if (isStatic && !_serverconfig2.default.isRemoteCrawler) {
    const staticPath = _fs2.default.existsSync(
      _path2.default.resolve(__dirname, `../../../resources/${req.getUrl()}`)
    )
      ? _path2.default.resolve(__dirname, `../../../resources/${req.getUrl()}`)
      : _path2.default.resolve(__dirname, `../../../../dist/${req.getUrl()}`)

    try {
      if (_InitEnv.ENV === 'development') {
        let body
        try {
          body = _fs2.default.readFileSync(staticPath)
        } catch (err) {
          _ConsoleHandler2.default.error(err)
        }
        const mimeType = _mimetypes2.default.lookup(staticPath)
        res
          .writeStatus('200')
          .writeHeader('Cache-Control', 'public, max-age=31556952')
          .writeHeader('Content-Type', mimeType )
          .end(body, true)
      } else {
        const contentEncoding = (() => {
          const tmpHeaderAcceptEncoding = req.getHeader('accept-encoding') || ''
          if (tmpHeaderAcceptEncoding.indexOf('br') !== -1) return 'br'
          else if (tmpHeaderAcceptEncoding.indexOf('gzip') !== -1) return 'gzip'
          return '' 
        })()
        const body = (() => {
          let content
          try {
            content = _fs2.default.readFileSync(staticPath)
          } catch (err) {
            _ConsoleHandler2.default.error(err)
          }
          const tmpBody =
            contentEncoding === 'br'
              ? _zlib.brotliCompressSync.call(void 0, content)
              : contentEncoding === 'gzip'
                ? _zlib.gzipSync.call(void 0, content)
                : content

          return tmpBody
        })()

        const mimeType = _mimetypes2.default.lookup(staticPath)

        res
          .writeStatus('200')
          .writeHeader('Cache-Control', 'public, max-age=31556952')
          .writeHeader('Content-Encoding', contentEncoding )
          .writeHeader('Content-Type', mimeType )
          .end(body, true)
      }
    } catch (err) {
      res.writeStatus('404').end('File not found', true)
    }

    res.writableEnded = true
  }
}

exports. default = DetectStaticMiddle
