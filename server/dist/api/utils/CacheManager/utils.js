"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var _crypto = require('crypto'); var _crypto2 = _interopRequireDefault(_crypto);
var _fs = require('fs'); var _fs2 = _interopRequireDefault(_fs);
var _util = require('util');





var _zlib = require('zlib');
var _store = require('../../../store');
var _ConsoleHandler = require('../../../utils/ConsoleHandler'); var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler);
var _PathHandler = require('../../../utils/PathHandler');









const dataPath = _PathHandler.getDataPath.call(void 0, )
const storePath = _PathHandler.getStorePath.call(void 0, )

if (!_fs2.default.existsSync(dataPath)) {
  try {
    _fs2.default.mkdirSync(dataPath)
  } catch (err) {
    _ConsoleHandler2.default.error(err)
  }
}

if (!_fs2.default.existsSync(storePath)) {
  try {
    _fs2.default.mkdirSync(storePath)
  } catch (err) {
    _ConsoleHandler2.default.error(err)
  }
}

 const regexKeyConverter =
  /^https?:\/\/(www\.)?|^www\.|botInfo=([^&]*)&deviceInfo=([^&]*)&localeInfo=([^&]*)&environmentInfo=([^&]*)/g; exports.regexKeyConverter = regexKeyConverter

 const getKey = (url) => {
  if (!url) {
    _ConsoleHandler2.default.error('Need provide "url" param!')
    return
  }

  url = url
    .replace('/?', '?')
    .replace(exports.regexKeyConverter, '')
    .replace(/\?(?:\&|)$/g, '')
  return _crypto2.default.createHash('md5').update(url).digest('hex')
}; exports.getKey = getKey // getKey

 const getFileInfo = async (file) => {
  if (!file) {
    _ConsoleHandler2.default.error('Need provide "file" param!')
    return
  }

  const result = await new Promise((res) => {
    _fs2.default.stat(file, (err, stats) => {
      if (err) {
        _ConsoleHandler2.default.error(err)
        res(undefined)
        return
      }

      res({
        size: stats.size,
        createdAt: stats.birthtime,
        updatedAt: stats.mtimeMs > stats.ctimeMs ? stats.mtime : stats.ctime,
        modifiedAt: stats.mtime,
        changedAt: stats.ctime,
        requestedAt: stats.atime,
      })
    })
  })

  return result
}; exports.getFileInfo = getFileInfo // getFileInfo

 const setRequestTimeInfo = async (file, value) => {
  if (!file || typeof file !== 'string' || !_fs2.default.existsSync(file)) {
    _ConsoleHandler2.default.error('File does not exist!')
    return
  }

  let stats
  try {
    stats = _fs2.default.statSync(file)
  } catch (err) {
    _ConsoleHandler2.default.error(err)
  }

  try {
    const info = await exports.getFileInfo.call(void 0, file)
    _ConsoleHandler2.default.log('file info', info)
    const fd = _fs2.default.openSync(file, 'r')
    _fs2.default.futimesSync(
      fd,
      value ,
      _nullishCoalesce(_optionalChain([info, 'optionalAccess', _ => _.updatedAt]), () => ( new Date()))
    )
    _fs2.default.close(fd)
    _ConsoleHandler2.default.log('File access time updated.')
  } catch (err) {
    _ConsoleHandler2.default.error(err)
  }
}; exports.setRequestTimeInfo = setRequestTimeInfo // setRequestTimeInfo

 const getStatus = (
  directory,
  key,
  extension
) => {
  if (
    !directory ||
    typeof directory !== 'string' ||
    !key ||
    typeof key !== 'string'
  ) {
    return
  }

  switch (true) {
    case _fs2.default.existsSync(`${directory}/${key}.${extension}`):
      return 'ready'
    case _fs2.default.existsSync(`${directory}/${key}.fetch.${extension}`):
      return 'fetch'
    default:
      return
  }
}; exports.getStatus = getStatus // getStatus

 const updateStatus = (
  directory,
  key,
  extension,
  newStatus
) => {
  const status = exports.getStatus.call(void 0, directory, key, extension)

  const file = `${directory}/${key}${
    !status || status === 'ready' ? '' : '.' + status
  }.${extension}`
  const newFile = `${directory}/${key}${
    !newStatus || newStatus === 'ready' ? '' : '.' + newStatus
  }.${extension}`

  if (file !== newFile) {
    _fs2.default.rename(file, newFile, (err) => {
      if (err) {
        _ConsoleHandler2.default.error(err)
      }
    })
  }
}; exports.updateStatus = updateStatus // updateStatus

 const get = async (
  directory,
  key,
  extension,
  options
) => {
  const optionsFormatted = {
    autoCreateIfEmpty: {
      enable: false,
    },
    updateRequestTime: true,
    ...(options || {}),
  }

  if (!directory) {
    _ConsoleHandler2.default.error('Need provide "directory" param!')
    return
  }

  if (!key) {
    _ConsoleHandler2.default.error('Need provide "key" param!')
    return
  }

  const status = exports.getStatus.call(void 0, directory, key, extension)
  const file = `${directory}/${key}${
    !status || status === 'ready'
      ? !optionsFormatted.autoCreateIfEmpty.status ||
        optionsFormatted.autoCreateIfEmpty.status === 'ready'
        ? ''
        : '.' + optionsFormatted.autoCreateIfEmpty.status
      : '.' + status
  }.${extension}`

  if (!status) {
    if (!optionsFormatted.autoCreateIfEmpty.enable) return

    _ConsoleHandler2.default.log(`Create file ${file}`)

    try {
      _fs2.default.writeFileSync(file, '')
      _ConsoleHandler2.default.log(`File ${key}.br has been created.`)

      const curTime = new Date()

      return {
        createdAt: curTime,
        updatedAt: curTime,
        requestedAt: curTime,
        modifiedAt: curTime,
        changedAt: curTime,
        status: status || optionsFormatted.autoCreateIfEmpty.status,
      }
    } catch (err) {
      _ConsoleHandler2.default.error(err)
      return
    }
  }
  const info = await exports.getFileInfo.call(void 0, file)

  if (!info || info.size === 0) {
    const curTime = new Date()
    _ConsoleHandler2.default.log(`File ${file} is empty`)
    return {
      createdAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _2 => _2.createdAt]), () => ( curTime)),
      updatedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _3 => _3.updatedAt]), () => ( curTime)),
      requestedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _4 => _4.requestedAt]), () => ( curTime)),
      modifiedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _5 => _5.modifiedAt]), () => ( curTime)),
      changedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _6 => _6.changedAt]), () => ( curTime)),
      status: status || optionsFormatted.autoCreateIfEmpty.status,
    }
  }

  if (optionsFormatted.sizeLimit && info.size > optionsFormatted.sizeLimit) {
    const curTime = new Date()
    _ConsoleHandler2.default.log(`File lager than sizeLimit`)
    return {
      createdAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _7 => _7.createdAt]), () => ( curTime)),
      updatedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _8 => _8.updatedAt]), () => ( curTime)),
      requestedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _9 => _9.requestedAt]), () => ( curTime)),
      modifiedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _10 => _10.modifiedAt]), () => ( curTime)),
      changedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _11 => _11.changedAt]), () => ( curTime)),
      status: status || optionsFormatted.autoCreateIfEmpty.status,
    }
  }

  if (optionsFormatted.updateRequestTime) {
    await exports.setRequestTimeInfo.call(void 0, file, new Date())
  }

  _ConsoleHandler2.default.log(`File ${file} is ready!`)

  const content = (() => {
    let tmpContent = ''

    try {
      tmpContent = _fs2.default.readFileSync(file)
    } catch (err) {
      _ConsoleHandler2.default.error(err)
      return null
    }

    try {
      if (extension === 'br') {
        tmpContent = _zlib.brotliDecompressSync.call(void 0, tmpContent).toString()
      } else tmpContent = tmpContent.toString('utf8')

      return JSON.parse(tmpContent )
    } catch (err) {
      _ConsoleHandler2.default.error(`Failed to decompress/parse cache file ${file}:`, err)
      return null
    }
  })()

  const objContent =
    !content || Array.isArray(content)
      ? {
          data: content,
        }
      : content

  // If content is null due to decompression/parse error, return minimal result
  if (content === null) {
    const curTime = new Date()
    return {
      createdAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _12 => _12.createdAt]), () => ( curTime)),
      updatedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _13 => _13.updatedAt]), () => ( curTime)),
      requestedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _14 => _14.requestedAt]), () => ( curTime)),
      modifiedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _15 => _15.modifiedAt]), () => ( curTime)),
      changedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _16 => _16.changedAt]), () => ( curTime)),
      status: status || optionsFormatted.autoCreateIfEmpty.status,
    }
  }

  return {
    createdAt: info.createdAt,
    updatedAt: info.updatedAt,
    requestedAt: info.requestedAt,
    modifiedAt: info.modifiedAt,
    changedAt: info.changedAt,
    status: status || optionsFormatted.autoCreateIfEmpty.status,
    ...objContent,
  }
}; exports.get = get // get

 const getLRUCache = async (
  directory,
  key,
  extension,
  options
) => {
  const optionsFormatted = {
    autoCreateIfEmpty: {
      enable: false,
    },
    updateRequestTime: true,
    ...(options || {}),
  }

  if (!directory) {
    _ConsoleHandler2.default.error('Need provide "directory" param!')
    return
  }

  if (!key) {
    _ConsoleHandler2.default.error('Need provide "key" param!')
    return
  }

  const apiStore = _store.getStore.call(void 0, 'api')

  if (!apiStore || !apiStore.lruCache) {
    _ConsoleHandler2.default.error('LRU Cache is not initialized')
    return
  }

  const lruCache = apiStore.lruCache
  const cacheKey = `${directory}/${key}.${extension}`

  let cacheEntry = lruCache.get(cacheKey)

  if (!cacheEntry) {
    if (!optionsFormatted.autoCreateIfEmpty.enable) return

    _ConsoleHandler2.default.log(`Create LRU Cache entry ${cacheKey}`)

    const curTime = new Date()
    const newEntry = {
      createdAt: curTime,
      updatedAt: curTime,
      requestedAt: curTime,
      modifiedAt: curTime,
      changedAt: curTime,
      status: optionsFormatted.autoCreateIfEmpty.status,
      content: '',
    }

    lruCache.set(cacheKey, newEntry, { size: 1 })

    return {
      createdAt: curTime,
      updatedAt: curTime,
      requestedAt: curTime,
      modifiedAt: curTime,
      changedAt: curTime,
      status: optionsFormatted.autoCreateIfEmpty.status,
    }
  }

  const info = {
    createdAt: cacheEntry.createdAt,
    updatedAt: cacheEntry.updatedAt,
    requestedAt: cacheEntry.requestedAt,
    modifiedAt: cacheEntry.modifiedAt,
    changedAt: cacheEntry.changedAt,
  }

  if (
    !cacheEntry.content ||
    (typeof cacheEntry.content === 'string' && cacheEntry.content.length === 0)
  ) {
    const curTime = new Date()
    _ConsoleHandler2.default.log(`LRU Cache entry ${cacheKey} is empty`)
    return {
      createdAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _17 => _17.createdAt]), () => ( curTime)),
      updatedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _18 => _18.updatedAt]), () => ( curTime)),
      requestedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _19 => _19.requestedAt]), () => ( curTime)),
      modifiedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _20 => _20.modifiedAt]), () => ( curTime)),
      changedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _21 => _21.changedAt]), () => ( curTime)),
      status: cacheEntry.status,
    }
  }

  if (
    optionsFormatted.sizeLimit &&
    cacheEntry.content.length > optionsFormatted.sizeLimit
  ) {
    const curTime = new Date()
    _ConsoleHandler2.default.log(`Cache entry larger than sizeLimit`)
    return {
      createdAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _22 => _22.createdAt]), () => ( curTime)),
      updatedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _23 => _23.updatedAt]), () => ( curTime)),
      requestedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _24 => _24.requestedAt]), () => ( curTime)),
      modifiedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _25 => _25.modifiedAt]), () => ( curTime)),
      changedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _26 => _26.changedAt]), () => ( curTime)),
      status: cacheEntry.status,
    }
  }

  if (optionsFormatted.updateRequestTime) {
    cacheEntry.requestedAt = new Date()
    lruCache.set(cacheKey, cacheEntry, { size: 1 })
  }

  _ConsoleHandler2.default.log(`LRU Cache entry ${cacheKey} is ready!`)

  const content = (() => {
    let tmpContent = cacheEntry.content

    try {
      if (extension === 'br') {
        tmpContent = _zlib.brotliDecompressSync.call(void 0, tmpContent).toString()
      } else tmpContent = tmpContent.toString('utf8')

      return JSON.parse(tmpContent )
    } catch (err) {
      _ConsoleHandler2.default.error(`Failed to decompress/parse cache entry ${cacheKey}:`, err)
      return null
    }
  })()

  const objContent =
    !content || Array.isArray(content)
      ? {
          data: content,
        }
      : content

  if (content === null) {
    const curTime = new Date()
    return {
      createdAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _27 => _27.createdAt]), () => ( curTime)),
      updatedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _28 => _28.updatedAt]), () => ( curTime)),
      requestedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _29 => _29.requestedAt]), () => ( curTime)),
      modifiedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _30 => _30.modifiedAt]), () => ( curTime)),
      changedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _31 => _31.changedAt]), () => ( curTime)),
      status: cacheEntry.status,
    }
  }

  return {
    createdAt: info.createdAt,
    updatedAt: info.updatedAt,
    requestedAt: info.requestedAt,
    modifiedAt: info.modifiedAt,
    changedAt: info.changedAt,
    status: cacheEntry.status,
    ...objContent,
  }
}; exports.getLRUCache = getLRUCache // getLRUCache

 const set = async (
  directory,
  key,
  extension,
  content,
  options
) => {
  if (!directory) {
    _ConsoleHandler2.default.error('Need provide "directory" param')
    return
  }

  if (!key) {
    _ConsoleHandler2.default.error('Need provide "key" param')
    return
  }

  options = {
    isCompress: true,
    status: 'ready',
    ...(options ? options : {}),
  }

  const status = exports.getStatus.call(void 0, directory, key, extension)
  const file = `${directory}/${key}${
    !status || status === 'ready' ? '' : '.' + status
  }.${extension}`

  // NOTE - If file is exist and isInit or not disable compress process, will be created new or updated
  const contentToSave = (() => {
    const contentToString =
      typeof content === 'string' || content instanceof Buffer
        ? content
        : JSON.stringify(content)

    if (options.isCompress) {
      return Buffer.isBuffer(content)
        ? content
        : _zlib.brotliCompressSync.call(void 0, contentToString)
    }

    return contentToString
  })()

  try {
    _fs2.default.writeFileSync(file, contentToSave)
    const fileTarget = `${directory}/${key}${
      !options.status || options.status === 'ready' ? '' : '.' + options.status
    }.${extension}`

    if (file !== fileTarget) _fs2.default.renameSync(file, fileTarget)
    _ConsoleHandler2.default.log(`File ${file} was updated!`)
  } catch (err) {
    _ConsoleHandler2.default.error(err)
    return
  }

  const result =
    (await exports.get.call(void 0, directory, key, extension, {
      autoCreateIfEmpty: {
        enable: false,
      },
    })) ||
    (() => {
      const curTime = new Date()
      return {
        createdAt: curTime,
        updatedAt: curTime,
        requestedAt: curTime,
        modifiedAt: curTime,
        changedAt: curTime,
        status: options.status,
        ...(typeof content === 'string'
          ? {
              cache: content,
            }
          : content),
      }
    })()

  return result
}; exports.set = set // set

 const setLRUCache = async (
  directory,
  key,
  extension,
  content,
  options
) => {
  if (!directory) {
    _ConsoleHandler2.default.error('Need provide "directory" param')
    return
  }

  if (!key) {
    _ConsoleHandler2.default.error('Need provide "key" param')
    return
  }

  const apiStore = _store.getStore.call(void 0, 'api')

  if (!apiStore || !apiStore.lruCache) {
    _ConsoleHandler2.default.error('LRU Cache is not initialized')
    return
  }

  const lruCache = apiStore.lruCache

  options = {
    isCompress: true,
    status: 'ready',
    ...(options ? options : {}),
  }

  // Create unique cache key
  const cacheKey = `${directory}/${key}.${extension}`

  // NOTE - Process content similar to file-based set
  const contentToSave = (() => {
    const contentToString =
      typeof content === 'string' || content instanceof Buffer
        ? content
        : JSON.stringify(content)

    if (options.isCompress && !(content instanceof Buffer)) {
      return _zlib.brotliCompressSync.call(void 0, contentToString)
    }

    return contentToString
  })()

  const curTime = new Date()

  // Prepare cache entry with metadata
  const cacheEntry = {
    content: contentToSave,
    createdAt: curTime,
    updatedAt: curTime,
    requestedAt: curTime,
    modifiedAt: curTime,
    changedAt: curTime,
    status: options.status,
    extension,
    ...(typeof content === 'string' ? { cache: content } : content),
  }

  try {
    lruCache.set(cacheKey, cacheEntry, { size: 1 })
    _ConsoleHandler2.default.log(`LRU Cache entry ${cacheKey} was updated!`)
  } catch (err) {
    _ConsoleHandler2.default.error(err)
    return
  }

  return cacheEntry 
}; exports.setLRUCache = setLRUCache // setLRUCache

 const remove = (
  directory,
  key,
  extension
) => {
  if (!directory) return _ConsoleHandler2.default.log('Key param can not empty!')
  if (!key) return _ConsoleHandler2.default.log('Key param can not empty!')

  const status = exports.getStatus.call(void 0, directory, key, extension)
  const file = `${directory}/${key}${
    !status || status === 'ready' ? '' : '.' + status
  }.${extension}`

  if (!file || typeof file !== 'string' || !_fs2.default.existsSync(file)) return

  try {
    _fs2.default.unlinkSync(file)
  } catch (err) {
    _ConsoleHandler2.default.error(err)
  }
}; exports.remove = remove // remove

 const getData = async (key, options) => {
  let result

  try {
    result = await exports.get.call(void 0, dataPath, key, 'json', options)
  } catch (err) {
    _ConsoleHandler2.default.error(err)
  }

  return result
}; exports.getData = getData // getData

 const getLRUCacheData = async (
  key,
  options
) => {
  let result

  try {
    result = await exports.getLRUCache.call(void 0, dataPath, key, 'json', options)
  } catch (err) {
    _ConsoleHandler2.default.error(err)
  }

  return result
}; exports.getLRUCacheData = getLRUCacheData // getLRUCacheData

 const getDataCompression = async (
  key,
  compression
) => {
  const file = `${dataPath}/${key}-${compression}.${compression}`
  const startAt = Date.now()
  const maxWaitTime = 7000
  const retryDelay = 100

  // Helper to wait
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  // Wait until file exists with retry
  while (!_fs2.default.existsSync(file)) {
    if (Date.now() - startAt >= maxWaitTime) {
      return undefined
    }
    await wait(retryDelay)
  }

  // File exists now, try to read it
  while (Date.now() - startAt < maxWaitTime) {
    try {
      const content = await _fs.promises.readFile(file)
      return content
    } catch (err) {
      // File might be locked or not fully written yet, wait and retry
      await wait(retryDelay)
    }
  }

  return undefined
}; exports.getDataCompression = getDataCompression // getDataCompression

 const getLRUCacheDataCompression = async (
  key,
  compression
) => {
  const apiStore = _store.getStore.call(void 0, 'api')

  if (!apiStore || !apiStore.lruCache) {
    _ConsoleHandler2.default.error('LRU Cache is not initialized')
    return
  }

  const lruCache = apiStore.lruCache
  const extension = compression === 'gzip' ? 'gz' : compression
  const cacheKey = `${dataPath}/${key}-${compression}.${extension}`

  const cacheEntry = lruCache.get(cacheKey)

  if (!cacheEntry) {
    return undefined
  }

  // Return the content as Buffer
  if (cacheEntry.content instanceof Buffer) {
    return cacheEntry.content
  }

  if (typeof cacheEntry.content === 'string') {
    return Buffer.from(cacheEntry.content)
  }

  return undefined
}; exports.getLRUCacheDataCompression = getLRUCacheDataCompression // getLRUCacheDataCompression

 const getStore = async (
  key,
  options
) => {
  let result

  try {
    result = await exports.get.call(void 0, storePath, key, 'json', options)
  } catch (err) {
    _ConsoleHandler2.default.error(err)
  }

  return result
}; exports.getStore = getStore // getStore

 const setData = async (
  key,
  content,
  options
) => {
  let result

  try {
    result = await exports.set.call(void 0, dataPath, key, 'json', content, options)
  } catch (err) {
    _ConsoleHandler2.default.error(err)
  }

  return result
}; exports.setData = setData // setData

 const setLRUCacheData = async (
  key,
  content,
  options
) => {
  let result

  try {
    result = await exports.setLRUCache.call(void 0, dataPath, key, 'json', content, options)
  } catch (err) {
    _ConsoleHandler2.default.error(err)
  }

  return result
}; exports.setLRUCacheData = setLRUCacheData // setLRUCacheData

 const setDataCompression = async (
  key,
  content,
  compression,
  options
) => {
  let result
  const extension = compression === 'gzip' ? 'gz' : compression

  try {
    result = await exports.set.call(void 0, 
      dataPath,
      `${key}-${compression}`,
      extension,
      content,
      options
    )
  } catch (err) {
    _ConsoleHandler2.default.error(err)
  }

  return result
}; exports.setDataCompression = setDataCompression // setDataCompression

 const setLRUCacheDataCompression = async (
  key,
  content,
  compression,
  options
) => {
  let result
  const extension = compression === 'gzip' ? 'gz' : compression

  try {
    result = await exports.setLRUCache.call(void 0, 
      dataPath,
      `${key}-${compression}`,
      extension,
      content,
      options
    )
  } catch (err) {
    _ConsoleHandler2.default.error(err)
  }

  return result
}; exports.setLRUCacheDataCompression = setLRUCacheDataCompression // setLRUCacheDataCompression

 const setStore = async (key, content) => {
  let result

  try {
    result = await exports.set.call(void 0, storePath, key, 'json', content, {
      isCompress: false,
    })
  } catch (err) {
    _ConsoleHandler2.default.error(err)
  }

  return result
}; exports.setStore = setStore // setStore

 const removeData = async (key) => {
  let result

  try {
    result = await exports.remove.call(void 0, dataPath, key, 'br')
  } catch (err) {
    _ConsoleHandler2.default.error(err)
  }

  return result
}; exports.removeData = removeData // removeData

 const removeStore = async (key) => {
  let result

  try {
    result = await exports.remove.call(void 0, storePath, key, 'json')
  } catch (err) {
    _ConsoleHandler2.default.error(err)
  }

  return result
}; exports.removeStore = removeStore // removeStore

 const updateDataStatus = async (key, newStatus) => {
  try {
    exports.updateStatus.call(void 0, dataPath, key, 'br', newStatus)
  } catch (err) {
    _ConsoleHandler2.default.error(err)
  }
}; exports.updateDataStatus = updateDataStatus // updateDataStatus

 const compressData = async (key, data) => {
  if (!data) return { br: '', gzip: '' }

  try {
    data = typeof data === 'string' ? JSON.parse(data) : data
  } catch (e) {
    _ConsoleHandler2.default.error('Failed to parse data for compression')
  }

  const tmpCompressData = {
    br: '',
    gzip: '',
  }

  try {
    const brottliCompressAsync = _util.promisify.call(void 0, _zlib.brotliCompress)
    const gzipCompressAsync = _util.promisify.call(void 0, _zlib.gzip)

    const tmpCompressDataPromise = await Promise.allSettled([
      brottliCompressAsync(data),
      gzipCompressAsync(data),
    ])

    tmpCompressData.br =
      tmpCompressDataPromise[0].status === 'fulfilled'
        ? tmpCompressDataPromise[0].value
        : ''
    tmpCompressData.gzip =
      tmpCompressDataPromise[1].status === 'fulfilled'
        ? tmpCompressDataPromise[1].value
        : ''

    for (const compression in tmpCompressData) {
      if (tmpCompressData[compression]) {
        exports.setDataCompression.call(void 0, 
          key,
          tmpCompressData[compression],
          compression 
        )
      }
    }
  } catch (err) {
    _ConsoleHandler2.default.error(err)
  }

  return tmpCompressData
}; exports.compressData = compressData // compressData

 const compressDataAndSaveToLRUCache = async (key, data) => {
  if (!data) return { br: '', gzip: '' }

  const tmpCompressData = {
    br: '',
    gzip: '',
  }

  try {
    const brottliCompressAsync = _util.promisify.call(void 0, _zlib.brotliCompress)
    const gzipCompressAsync = _util.promisify.call(void 0, _zlib.gzip)

    const tmpCompressDataPromise = await Promise.allSettled([
      brottliCompressAsync(data),
      gzipCompressAsync(data),
    ])

    tmpCompressData.br =
      tmpCompressDataPromise[0].status === 'fulfilled'
        ? tmpCompressDataPromise[0].value
        : ''
    tmpCompressData.gzip =
      tmpCompressDataPromise[1].status === 'fulfilled'
        ? tmpCompressDataPromise[1].value
        : ''

    for (const compression in tmpCompressData) {
      if (tmpCompressData[compression]) {
        exports.setLRUCacheDataCompression.call(void 0, 
          key,
          tmpCompressData[compression],
          compression 
        )
      }
    }
  } catch (err) {
    _ConsoleHandler2.default.error(err)
  }

  return tmpCompressData
}; exports.compressDataAndSaveToLRUCache = compressDataAndSaveToLRUCache // compressDataAndSaveToLRUCache
