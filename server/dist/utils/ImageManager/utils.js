"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _fs = require('fs'); var _fs2 = _interopRequireDefault(_fs);
var _mimetypes = require('mime-types'); var _mimetypes2 = _interopRequireDefault(_mimetypes);
var _path = require('path'); var _path2 = _interopRequireDefault(_path);
var _sharp = require('sharp'); var _sharp2 = _interopRequireDefault(_sharp);
var _ConsoleHandler = require('../ConsoleHandler'); var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler);
var _PathHandler = require('../PathHandler');
var _constants = require('./constants');

const ImageManager = (
  url,
  options


) => {
  const _options = {
    enableOptimize: false,
    ...options,
  }

  const enableOptimize = _options.enableOptimize

  const pathname = (() => {
    switch (true) {
      case url.startsWith('http'):
        return new URL(url).pathname
      case url.startsWith('/'):
        return url
      default:
        return `/${url}`
    }
  })()

  const _distPath = _path2.default.resolve(__dirname, '../../../dist')
  const _resourcePath = _PathHandler.getResourcePath.call(void 0, )

  const distPathName = _path2.default.join(_distPath, pathname)
  const resourcePathName = _path2.default.join(_resourcePath, pathname)

  const get = () => {
    if (!url) {
      _ConsoleHandler2.default.error('Need provide "url" param!')
      return null
    }

    const resourceOptimizePathName = _path2.default.join(
      _resourcePath,
      'optimize',
      pathname
    )

    if (enableOptimize && _fs2.default.existsSync(resourceOptimizePathName)) {
      try {
        const content = _fs2.default.readFileSync(resourceOptimizePathName)

        return content
      } catch (error) {
        _ConsoleHandler2.default.error(`Failed to read optimized file: ${error.message}`)
      }
    }

    const correctPathName = distPathName || resourcePathName

    if (_fs2.default.existsSync(correctPathName)) {
      try {
        const content = _fs2.default.readFileSync(correctPathName)
        return content
      } catch (error) {
        _ConsoleHandler2.default.error(`Failed to read file: ${error.message}`)
      }
    }

    return null
  } // get

  const set = (content) => {
    if (!content) {
      _ConsoleHandler2.default.error('Need to provide "content" param!')
      return
    }

    const _targetPath = resourcePathName

    const targetPathName = _path2.default.join(
      _targetPath,
      pathname.replace('.', '_optimized.')
    )

    try {
      _fs2.default.writeFileSync(targetPathName, content)
    } catch (error) {
      _ConsoleHandler2.default.error(`Failed to write file: ${error.message}`)
    }
  } // set

  const remove = () => {
    const _targetPath = resourcePathName

    const targetPathName = _path2.default.join(
      _targetPath,
      pathname.replace('.', '_optimized.')
    )

    if (!_fs2.default.existsSync(targetPathName)) return

    try {
      _fs2.default.unlinkSync(targetPathName)
    } catch (error) {
      _ConsoleHandler2.default.error(`Failed to remove file: ${error.message}`)
    }
  } // remove

  const optimize = () => {} // optimize

  const isExist = () => {} // isExist
} // ImageManager

exports. default = ImageManager

 const optimizeImage = async (path) => {
  if (!path) {
    throw new Error('Path is required to optimize the image.')
  }

  const mimeType = _mimetypes2.default.lookup(path) || ''

  try {
    let optimizedImage
    let fileName = 'optimized-image'
    let fileType = mimeType

    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      optimizedImage = await _sharp2.default.call(void 0, path)
        .resize(200)
        .jpeg({ mozjpeg: true, quality: 80 })
        .toBuffer()
      fileName += '.jpg'
      fileType = 'image/jpeg'
    } else if (mimeType === 'image/png') {
      optimizedImage = await _sharp2.default.call(void 0, path)
        .resize(200)
        .png({ quality: 80, compressionLevel: 9 })
        .toBuffer()
      fileName += '.png'
      fileType = 'image/png'
    } else if (mimeType === 'image/webp') {
      optimizedImage = await _sharp2.default.call(void 0, path)
        .resize(200)
        .webp({ quality: 80 })
        .toBuffer()
      fileName += '.webp'
      fileType = 'image/webp'
    } else if (mimeType === 'image/gif') {
      optimizedImage = await _sharp2.default.call(void 0, path).resize(200).gif().toBuffer()
      fileName += '.gif'
      fileType = 'image/gif'
    }

    return new File([new Uint8Array(optimizedImage)], fileName, {
      type: fileType,
    })
  } catch (error) {
    throw new Error(`Failed to optimize image: ${error.message}`)
  }
}; exports.optimizeImage = optimizeImage // optimizeImage

 const isImage = (mimeType) => {
  return _constants.IMAGE_MIME_TYPE_LIST_WITHOUT_SVG.includes(mimeType)
}; exports.isImage = isImage // isImage
