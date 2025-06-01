"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _fs = require('fs'); var _fs2 = _interopRequireDefault(_fs);
var _mimetypes = require('mime-types'); var _mimetypes2 = _interopRequireDefault(_mimetypes);
var _ConsoleHandler = require('./ConsoleHandler'); var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler);

const sendFile = async (path, res, statusCode) => {
  if (!path) return

  try {
    await new Promise((resolve, reject) => {
      _fs2.default.readFile(path, (err, buf) => {
        if (err) {
          reject(err)
          return _ConsoleHandler2.default.error(err)
        }

        const mimeType = _mimetypes2.default.lookup(path)
        res.statusCode = statusCode || 200
        if (!res.getHeader('Content-Type'))
          res.setHeader('Content-Type', mimeType )
        res.end(buf)

        resolve(null)
      })
    })
  } catch (err) {
    res.statusCode = 404
    res.end('File not found')
  }
}

exports. default = sendFile
