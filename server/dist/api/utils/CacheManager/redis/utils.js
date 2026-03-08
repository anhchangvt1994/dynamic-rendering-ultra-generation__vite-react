"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var _ioredis = require('ioredis'); var _ioredis2 = _interopRequireDefault(_ioredis);
var _util = require('util');





var _zlib = require('zlib');
var _ConsoleHandler = require('../../../../utils/ConsoleHandler'); var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler);
var _InitEnv = require('../../../../utils/InitEnv');
var _PathHandler = require('../../../../utils/PathHandler');








// Redis client configuration for LRU Cache replacement
const redisClient = new (0, _ioredis2.default)({
  host: _InitEnv.PROCESS_ENV.REDIS_HOST || '127.0.0.1',
  port: parseInt(_InitEnv.PROCESS_ENV.REDIS_PORT || '6379', 10),
  password: _InitEnv.PROCESS_ENV.REDIS_PASSWORD || undefined,
  db: parseInt(_InitEnv.PROCESS_ENV.REDIS_DB || '0', 10),
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 3) {
      _ConsoleHandler2.default.error('Redis connection failed after 3 retries')
      return null
    }
    return Math.min(times * 200, 1000)
  },
  lazyConnect: true,
})

// Redis key prefix for LRU cache
const REDIS_PREFIX = 'redis_cache:'

// Default TTL for cache entries (5 minutes like original LRU cache)
// NOTE: This TTL acts as a safety net. Redis LRU will auto-evict least recently
// used keys when memory is full, regardless of TTL. Manual removal handles
// explicit expiredTime invalidation.
const DEFAULT_TTL = 1000 * 60 * 5

// Connect to Redis
redisClient.connect().catch((err) => {
  _ConsoleHandler2.default.error('Failed to connect to Redis:', err)
})

// Configure LRU eviction policy after connection is ready
redisClient.on('ready', async () => {
  try {
    // Set LRU eviction policy: evict least recently used keys when memory is full
    await redisClient.config('SET', 'maxmemory-policy', 'allkeys-lru')
    _ConsoleHandler2.default.log('Redis LRU eviction policy configured: allkeys-lru')

    // Optional: Set maxmemory limit (e.g., 256mb) via environment variable
    const maxMemory = _InitEnv.PROCESS_ENV.REDIS_MAX_MEMORY
    if (maxMemory) {
      await redisClient.config('SET', 'maxmemory', maxMemory)
      _ConsoleHandler2.default.log(`Redis maxmemory set to: ${maxMemory}`)
    }
  } catch (err) {
    _ConsoleHandler2.default.error('Failed to configure Redis LRU:', err)
  }
})

const dataPath = _PathHandler.getDataPath.call(void 0, )
const storePath = _PathHandler.getStorePath.call(void 0, )

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

  const cacheKey = `${REDIS_PREFIX}${directory}/${key}.${extension}`

  try {
    const cachedData = await redisClient.get(cacheKey)

    if (!cachedData) {
      if (!optionsFormatted.autoCreateIfEmpty.enable) return

      _ConsoleHandler2.default.log(`Create Redis LRU Cache entry ${cacheKey}`)

      const curTime = new Date()
      const newEntry = {
        createdAt: curTime.toISOString(),
        updatedAt: curTime.toISOString(),
        requestedAt: curTime.toISOString(),
        modifiedAt: curTime.toISOString(),
        changedAt: curTime.toISOString(),
        status: optionsFormatted.autoCreateIfEmpty.status || 'ready',
        content: '',
      }

      await redisClient.set(
        cacheKey,
        JSON.stringify(newEntry),
        'EX',
        Math.floor(DEFAULT_TTL / 1000)
      )

      return {
        createdAt: curTime,
        updatedAt: curTime,
        requestedAt: curTime,
        modifiedAt: curTime,
        changedAt: curTime,
        status: optionsFormatted.autoCreateIfEmpty.status || 'ready',
      }
    }

    const cacheEntry = JSON.parse(cachedData)

    const info = {
      createdAt: new Date(cacheEntry.createdAt),
      updatedAt: new Date(cacheEntry.updatedAt),
      requestedAt: new Date(cacheEntry.requestedAt),
      modifiedAt: new Date(cacheEntry.modifiedAt),
      changedAt: new Date(cacheEntry.changedAt),
    }

    if (
      !cacheEntry.content ||
      (typeof cacheEntry.content === 'string' &&
        cacheEntry.content.length === 0)
    ) {
      const curTime = new Date()
      _ConsoleHandler2.default.log(`Redis LRU Cache entry ${cacheKey} is empty`)
      return {
        createdAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _ => _.createdAt]), () => ( curTime)),
        updatedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _2 => _2.updatedAt]), () => ( curTime)),
        requestedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _3 => _3.requestedAt]), () => ( curTime)),
        modifiedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _4 => _4.modifiedAt]), () => ( curTime)),
        changedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _5 => _5.changedAt]), () => ( curTime)),
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
        createdAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _6 => _6.createdAt]), () => ( curTime)),
        updatedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _7 => _7.updatedAt]), () => ( curTime)),
        requestedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _8 => _8.requestedAt]), () => ( curTime)),
        modifiedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _9 => _9.modifiedAt]), () => ( curTime)),
        changedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _10 => _10.changedAt]), () => ( curTime)),
        status: cacheEntry.status,
      }
    }

    if (optionsFormatted.updateRequestTime) {
      await exports.setRequestTimeInfo.call(void 0, cacheKey, new Date())
    }

    _ConsoleHandler2.default.log(`Redis LRU Cache entry ${cacheKey} is ready!`)

    const content = (() => {
      let tmpContent = cacheEntry.content

      try {
        if (extension === 'br') {
          const contentBuffer =
            typeof tmpContent === 'string'
              ? Buffer.from(tmpContent, 'base64')
              : tmpContent
          tmpContent = _zlib.brotliDecompressSync.call(void 0, contentBuffer).toString()
        } else {
          tmpContent =
            typeof tmpContent === 'string'
              ? tmpContent
              : tmpContent.toString('utf8')
        }

        return JSON.parse(tmpContent )
      } catch (err) {
        _ConsoleHandler2.default.error(
          `Failed to decompress/parse cache entry ${cacheKey}:`,
          err
        )
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
        createdAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _11 => _11.createdAt]), () => ( curTime)),
        updatedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _12 => _12.updatedAt]), () => ( curTime)),
        requestedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _13 => _13.requestedAt]), () => ( curTime)),
        modifiedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _14 => _14.modifiedAt]), () => ( curTime)),
        changedAt: _nullishCoalesce(_optionalChain([info, 'optionalAccess', _15 => _15.changedAt]), () => ( curTime)),
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
  } catch (err) {
    _ConsoleHandler2.default.error('Error accessing Redis LRU Cache:', err)
    return
  }
}; exports.get = get // get

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

  // Create unique cache key with Redis prefix
  const redisKey = `${REDIS_PREFIX}${directory}/${key}.${extension}`

  // NOTE - Process content similar to file-based set
  const contentToSave = (() => {
    const contentToString =
      typeof content === 'string' || content instanceof Buffer
        ? content
        : JSON.stringify(content)

    if (options.isCompress && !(content instanceof Buffer)) {
      const compressed = _zlib.brotliCompressSync.call(void 0, contentToString)
      // Store compressed content as base64 to preserve binary data in JSON
      return compressed.toString('base64')
    }

    // Store string content as-is, Buffer content as base64
    if (content instanceof Buffer) {
      return content.toString('base64')
    }
    return contentToString
  })()

  const curTime = new Date()

  // Prepare cache entry with metadata
  const cacheEntry = {
    content: contentToSave,
    createdAt: curTime.toISOString(),
    updatedAt: curTime.toISOString(),
    requestedAt: curTime.toISOString(),
    modifiedAt: curTime.toISOString(),
    changedAt: curTime.toISOString(),
    status: options.status,
    extension,
    ...(typeof content === 'string' ? { cache: content } : content),
  }

  try {
    await redisClient.set(
      redisKey,
      JSON.stringify(cacheEntry),
      'EX',
      Math.floor(DEFAULT_TTL / 1000)
    )
    _ConsoleHandler2.default.log(`Redis LRU Cache entry ${redisKey} was updated!`)
  } catch (err) {
    _ConsoleHandler2.default.error(err)
    return
  }

  return cacheEntry 
}; exports.set = set // set

 const getData = async (key, options) => {
  let result

  try {
    result = await exports.get.call(void 0, dataPath, key, 'json', options)
  } catch (err) {
    _ConsoleHandler2.default.error(err)
  }

  return result
}; exports.getData = getData // getData

 const getDataCompression = async (
  key,
  compression
) => {
  const extension = compression === 'gzip' ? 'gz' : compression
  const redisKey = `${REDIS_PREFIX}${dataPath}/${key}-${compression}.${extension}`

  try {
    const cachedData = await redisClient.get(redisKey)

    if (!cachedData) {
      return undefined
    }

    const cacheEntry = JSON.parse(cachedData)

    // Return the content as Buffer (stored as base64)
    if (cacheEntry.content) {
      if (typeof cacheEntry.content === 'string') {
        return Buffer.from(cacheEntry.content, 'base64')
      }
    }

    return undefined
  } catch (err) {
    _ConsoleHandler2.default.error('Error accessing Redis LRU Cache:', err)
    return undefined
  }
}; exports.getDataCompression = getDataCompression // getDataCompression

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

 const compressData = async (key, data) => {
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

 const remove = async (
  directory,
  key,
  extension
) => {
  if (!directory) {
    _ConsoleHandler2.default.error('Need provide "directory" param!')
    return
  }

  if (!key) {
    _ConsoleHandler2.default.error('Need provide "key" param!')
    return
  }

  // Create Redis key using the same pattern as get and set
  const redisKey = `${REDIS_PREFIX}${directory}/${key}.${extension}`

  try {
    await redisClient.del(redisKey)
    _ConsoleHandler2.default.log(`Redis LRU Cache entry ${redisKey} was removed!`)
  } catch (err) {
    _ConsoleHandler2.default.error('Error removing Redis LRU Cache entry:', err)
  }
}; exports.remove = remove // remove

 const removeData = async (key) => {
  let result

  try {
    result = await exports.remove.call(void 0, dataPath, key, 'br')
  } catch (err) {
    _ConsoleHandler2.default.error(err)
  }

  return result
}; exports.removeData = removeData // removeData

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

 const removeStore = async (key) => {
  let result

  try {
    result = await exports.remove.call(void 0, storePath, key, 'json')
  } catch (err) {
    _ConsoleHandler2.default.error(err)
  }

  return result
}; exports.removeStore = removeStore // removeStore

 const updateStatus = async (
  directory,
  key,
  extension,
  newStatus
) => {
  if (!directory) {
    _ConsoleHandler2.default.error('Need provide "directory" param!')
    return
  }

  if (!key) {
    _ConsoleHandler2.default.error('Need provide "key" param!')
    return
  }

  // Create Redis key using the same pattern as get and set
  const redisKey = `${REDIS_PREFIX}${directory}/${key}.${extension}`

  try {
    // Get the current cache entry
    const cachedData = await redisClient.get(redisKey)

    if (!cachedData) {
      _ConsoleHandler2.default.error(`Redis cache entry ${redisKey} does not exist!`)
      return
    }

    const cacheEntry = JSON.parse(cachedData)

    // Update the status field
    cacheEntry.status = newStatus

    // Write the entry back to Redis with TTL preserved
    await redisClient.set(
      redisKey,
      JSON.stringify(cacheEntry),
      'EX',
      Math.floor(DEFAULT_TTL / 1000)
    )

    _ConsoleHandler2.default.log(`Redis cache entry ${redisKey} status updated to ${newStatus}`)
  } catch (err) {
    _ConsoleHandler2.default.error('Error updating Redis cache status:', err)
  }
}; exports.updateStatus = updateStatus // updateStatus

 const updateDataStatus = async (key, newStatus) => {
  try {
    exports.updateStatus.call(void 0, dataPath, key, 'br', newStatus)
  } catch (err) {
    _ConsoleHandler2.default.error(err)
  }
}; exports.updateDataStatus = updateDataStatus // updateDataStatus

 const setRequestTimeInfo = async (file, value) => {
  if (!file || typeof file !== 'string') {
    _ConsoleHandler2.default.error('Invalid file key!')
    return
  }

  // The file parameter is the Redis key (e.g., redis_cache:path/to/key.json)
  const redisKey = file.startsWith(REDIS_PREFIX)
    ? file
    : `${REDIS_PREFIX}${file}`

  try {
    // Get the current cache entry
    const cachedData = await redisClient.get(redisKey)

    if (!cachedData) {
      _ConsoleHandler2.default.error(`Redis cache entry ${redisKey} does not exist!`)
      return
    }

    const cacheEntry = JSON.parse(cachedData)

    // Convert the value to ISO string for storage
    // value can be Date, timestamp (number), or ISO string
    let requestedAtValue
    if (value instanceof Date) {
      requestedAtValue = value.toISOString()
    } else if (typeof value === 'number') {
      requestedAtValue = new Date(value).toISOString()
    } else if (typeof value === 'string') {
      requestedAtValue = new Date(value).toISOString()
    } else {
      requestedAtValue = new Date().toISOString()
    }

    // Update the requestedAt field
    cacheEntry.requestedAt = requestedAtValue

    // Write the entry back to Redis with TTL preserved
    await redisClient.set(
      redisKey,
      JSON.stringify(cacheEntry),
      'EX',
      Math.floor(DEFAULT_TTL / 1000)
    )

    _ConsoleHandler2.default.log(
      `Redis cache entry ${redisKey} requestedAt updated to ${requestedAtValue}`
    )
  } catch (err) {
    _ConsoleHandler2.default.error('Error updating Redis cache request time:', err)
  }
}; exports.setRequestTimeInfo = setRequestTimeInfo // setRequestTimeInfo
