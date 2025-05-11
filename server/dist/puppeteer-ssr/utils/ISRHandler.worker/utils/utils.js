'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj }
}
function _nullishCoalesce(lhs, rhsFn) {
  if (lhs != null) {
    return lhs
  } else {
    return rhsFn()
  }
}
function _optionalChain(ops) {
  let lastAccessLHS = undefined
  let value = ops[0]
  let i = 1
  while (i < ops.length) {
    const op = ops[i]
    const fn = ops[i + 1]
    i += 2
    if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) {
      return undefined
    }
    if (op === 'access' || op === 'optionalAccess') {
      lastAccessLHS = value
      value = fn(value)
    } else if (op === 'call' || op === 'optionalCall') {
      value = fn((...args) => value.call(lastAccessLHS, ...args))
      lastAccessLHS = undefined
    }
  }
  return value
}
var _fs = require('fs')
var _path = require('path')

var _utils = require('../../../../api/utils/CacheManager/utils')
var _ConsoleHandler = require('../../../../utils/ConsoleHandler')
var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler)
var _StringHelper = require('../../../../utils/StringHelper')
var _constants = require('../../../constants')

// import sharp from 'sharp'

const getInternalScript = async (params) => {
  if (!params) {
    _ConsoleHandler2.default.error('Need provide `params`')
    return
  }

  if (!params.url) {
    _ConsoleHandler2.default.error('Need provide `params.url`')
    return
  }

  const urlSplitted = params.url.split('/')
  const file = urlSplitted[urlSplitted.length - 1].split('?')[0]
  const filePath = _path.resolve.call(
    void 0,
    __dirname,
    `../../../../../../dist/${file}`
  )

  try {
    const body = _fs.readFileSync.call(void 0, filePath)

    return {
      body,
      status: 200,
    }
  } catch (err) {
    _ConsoleHandler2.default.error(err)
    return {
      body: 'File not found',
      status: 404,
    }
  }
}
exports.getInternalScript = getInternalScript // getInternalScript

const getInternalHTML = async (params) => {
  if (!params) {
    _ConsoleHandler2.default.error('Need provide `params`')
    return
  }

  if (!params.url) {
    _ConsoleHandler2.default.error('Need provide `params.url`')
    return
  }

  const { url } = params

  try {
    const filePath = _path.resolve.call(
      void 0,
      __dirname,
      '../../../../../../dist/index.html'
    )

    const apiStoreData = await (async () => {
      let tmpStoreKey
      let tmpAPIStore

      tmpStoreKey = _StringHelper.hashCode.call(void 0, url)

      tmpAPIStore = await _utils.getStore.call(void 0, tmpStoreKey)

      if (tmpAPIStore) return tmpAPIStore.data

      const specialInfo = _nullishCoalesce(
        _optionalChain([
          _constants.regexQueryStringSpecialInfo,
          'access',
          (_) => _.exec,
          'call',
          (_2) => _2(url),
          'optionalAccess',
          (_3) => _3.groups,
        ]),
        () => ({})
      )

      const deviceType = (() => {
        let tmpDeviceType
        try {
          tmpDeviceType = _optionalChain([
            JSON,
            'access',
            (_4) => _4.parse,
            'call',
            (_5) => _5(specialInfo.deviceInfo),
            'optionalAccess',
            (_6) => _6.type,
          ])
        } catch (err) {
          _ConsoleHandler2.default.error(err)
        }

        return tmpDeviceType
      })()

      tmpStoreKey = _StringHelper.hashCode.call(
        void 0,
        `${url}${
          url.includes('?') && deviceType
            ? '&device=' + deviceType
            : '?device=' + deviceType
        }`
      )

      tmpAPIStore = await _utils.getStore.call(void 0, tmpStoreKey)

      if (tmpAPIStore) return tmpAPIStore.data

      return
    })()

    const WindowAPIStore = {}

    if (apiStoreData) {
      if (apiStoreData.length) {
        for (const cacheKey of apiStoreData) {
          const apiCache = await _utils.getData.call(void 0, cacheKey)
          if (!apiCache || !apiCache.cache || apiCache.cache.status !== 200)
            continue

          WindowAPIStore[cacheKey] = apiCache.cache.data
        }
      }
    }

    let html = _fs.readFileSync.call(void 0, filePath, 'utf8') || ''

    html = html.replace(
      '</head>',
      `<script>window.API_STORE=${JSON.stringify(
        WindowAPIStore
      )}</script></head>`
    )

    return {
      body: html,
      status: 200,
    }
  } catch (err) {
    _ConsoleHandler2.default.error(err)
    return {
      body: 'File not found',
      status: 404,
    }
  }
}
exports.getInternalHTML = getInternalHTML // getInternalHTML

// export const compressInternalImage = async (image: string) => {
// 	if (!image) {
// 		Console.log('Need provide `image`!')
// 		return
// 	}

// 	let result
// 	let timeout

// 	try {
// 		result = await new Promise((res, rej) => {
// 			timeout = setTimeout(() => rej(new Error('Time out')), 300)

// 			sharp(image)
// 				.resize(200)
// 				.jpeg({ mozjpeg: true, quality: 1 })
// 				.toBuffer()
// 				.then((data) => {
// 					sharp(data)
// 						.toFormat('webp', { quality: 1 })
// 						.toBuffer()
// 						.then((data) => {
// 							res(data)
// 						})
// 					res(data)
// 				})
// 				.catch((err) => {
// 					rej(err)
// 				})
// 		})
// 	} catch (err) {
// 		throw new Error(err)
// 	}

// 	return result
// } // compressInternalImage

// export const compressExternalImage = async (image: string) => {
// 	if (!image) {
// 		Console.log('Need provide `image`!')
// 		return
// 	}

// 	let result
// 	let timeout

// 	try {
// 		result = await new Promise((res, rej) => {
// 			timeout = setTimeout(() => rej(new Error('Time out')), 300)

// 			fetch(image)
// 				.then(async (response) => {
// 					try {
// 						const imageArrBuffer = await response.arrayBuffer()

// 						sharp(imageArrBuffer)
// 							.resize(200)
// 							.jpeg({ mozjpeg: true, quality: 20 })
// 							.toBuffer()
// 							.then((data) => {
// 								sharp(data)
// 									.toFormat('webp')
// 									.toBuffer()
// 									.then((data) => {
// 										res(data)
// 									})
// 								res(data)
// 							})
// 							.catch((err) => {
// 								rej(err)
// 							})
// 					} catch (err) {
// 						rej(err)
// 					} finally {
// 						clearTimeout(timeout)
// 					}
// 				})
// 				.catch((err) => {
// 					rej(err)
// 				})
// 				.finally(() => {
// 					clearTimeout(timeout)
// 				})
// 		})
// 	} catch (err) {
// 		throw new Error(err)
// 	}

// 	return result
// } // compressExternalImage
