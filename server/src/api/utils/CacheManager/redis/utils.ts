import Redis from 'ioredis'
import { promisify } from 'util'
import {
  brotliCompress,
  brotliCompressSync,
  brotliDecompressSync,
  gzip,
} from 'zlib'
import Console from '../../../../utils/ConsoleHandler'
import { PROCESS_ENV } from '../../../../utils/InitEnv'
import { getDataPath, getStorePath } from '../../../../utils/PathHandler'
import {
  ICacheResult,
  IGetCacheOptionsParam,
  ISetCacheContent,
  ISetCacheOptionsParam,
  IStatus,
} from '../types'

// Redis client configuration for LRU Cache replacement
const redisClient = new Redis({
  host: PROCESS_ENV.REDIS_HOST || '127.0.0.1',
  port: parseInt(PROCESS_ENV.REDIS_PORT || '6379', 10),
  password: PROCESS_ENV.REDIS_PASSWORD || undefined,
  db: parseInt(PROCESS_ENV.REDIS_DB || '0', 10),
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 3) {
      Console.error('Redis connection failed after 3 retries')
      return null
    }
    return Math.min(times * 200, 1000)
  },
  lazyConnect: true,
  connectTimeout: 10000, // Increase to 10 seconds
})

// Redis key prefix for LRU cache
const REDIS_PREFIX = 'redis_cache:'

// Default TTL for cache entries (5 minutes like original LRU cache)
// NOTE: This TTL acts as a safety net. Redis LRU will auto-evict least recently
// used keys when memory is full, regardless of TTL. Manual removal handles
// explicit expiredTime invalidation.

// TTL for infinite cache (24 hours)
const DEFAULT_TTL = 1000 * 60 * 60 * 24

// Helper function to calculate TTL based on expiredTime
const calculateTTL = (expiredTime: number | string | undefined): number => {
  // If expiredTime is a valid number > 0, use it as TTL (convert ms to seconds)
  if (typeof expiredTime === 'number' && expiredTime > 0) {
    return Math.floor(expiredTime / 1000)
  }

  // Default to 5 minutes TTL
  return Math.floor(DEFAULT_TTL / 1000)
}

// Handle all Redis errors (prevents "Unhandled error event" crash)
redisClient.on('error', (err) => {
  Console.error('[ioredis] Redis client error:', err.message)
})

// Connect to Redis
redisClient.connect().catch((err) => {
  Console.error('Failed to connect to Redis:', err)
})

// Configure LRU eviction policy after connection is ready
redisClient.on('ready', async () => {
  try {
    // Set LRU eviction policy: evict least recently used keys when memory is full
    await redisClient.config('SET', 'maxmemory-policy', 'allkeys-lru')
    Console.log('Redis LRU eviction policy configured: allkeys-lru')

    // Optional: Set maxmemory limit (e.g., 256mb) via environment variable
    const maxMemory = PROCESS_ENV.REDIS_MAX_MEMORY
    if (maxMemory) {
      await redisClient.config('SET', 'maxmemory', maxMemory)
      Console.log(`Redis maxmemory set to: ${maxMemory}`)
    }
  } catch (err) {
    Console.error('Failed to configure Redis LRU:', err)
  }
})

const dataPath = getDataPath()
const storePath = getStorePath()

export const get = async (
  directory: string,
  key: string,
  extension: 'json' | 'br' | 'gz',
  options?: IGetCacheOptionsParam
): Promise<ICacheResult> => {
  const optionsFormatted = {
    autoCreateIfEmpty: {
      enable: false,
    },
    updateRequestTime: true,
    ...(options || {}),
  }

  if (!directory) {
    Console.error('Need provide "directory" param!')
    return
  }

  if (!key) {
    Console.error('Need provide "key" param!')
    return
  }

  const cacheKey = `${REDIS_PREFIX}${directory}/${key}.${extension}`

  try {
    const cachedData = await redisClient.get(cacheKey)

    if (!cachedData) {
      if (!optionsFormatted.autoCreateIfEmpty.enable) return

      Console.log(`Create Redis LRU Cache entry ${cacheKey}`)

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
      Console.log(`Redis LRU Cache entry ${cacheKey} is empty`)
      return {
        createdAt: info?.createdAt ?? curTime,
        updatedAt: info?.updatedAt ?? curTime,
        requestedAt: info?.requestedAt ?? curTime,
        modifiedAt: info?.modifiedAt ?? curTime,
        changedAt: info?.changedAt ?? curTime,
        status: cacheEntry.status,
      }
    }

    if (
      optionsFormatted.sizeLimit &&
      cacheEntry.content.length > optionsFormatted.sizeLimit
    ) {
      const curTime = new Date()
      Console.log(`Cache entry larger than sizeLimit`)
      return {
        createdAt: info?.createdAt ?? curTime,
        updatedAt: info?.updatedAt ?? curTime,
        requestedAt: info?.requestedAt ?? curTime,
        modifiedAt: info?.modifiedAt ?? curTime,
        changedAt: info?.changedAt ?? curTime,
        status: cacheEntry.status,
      }
    }

    if (optionsFormatted.updateRequestTime) {
      await setRequestTimeInfo(cacheKey, new Date())
    }

    Console.log(`Redis LRU Cache entry ${cacheKey} is ready!`)

    const content = (() => {
      let tmpContent: string | Buffer = cacheEntry.content

      try {
        if (extension === 'br') {
          const contentBuffer =
            typeof tmpContent === 'string'
              ? Buffer.from(tmpContent, 'base64')
              : tmpContent
          tmpContent = brotliDecompressSync(contentBuffer).toString()
        } else {
          tmpContent =
            typeof tmpContent === 'string'
              ? tmpContent
              : tmpContent.toString('utf8')
        }

        return JSON.parse(tmpContent as unknown as string)
      } catch (err) {
        Console.error(
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
        createdAt: info?.createdAt ?? curTime,
        updatedAt: info?.updatedAt ?? curTime,
        requestedAt: info?.requestedAt ?? curTime,
        modifiedAt: info?.modifiedAt ?? curTime,
        changedAt: info?.changedAt ?? curTime,
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
    Console.error('Error accessing Redis LRU Cache:', err)
    return
  }
} // get

export const set = async (
  directory: string,
  key: string,
  extension: 'json' | 'br' | 'gz',
  content: string | Buffer | ISetCacheContent,
  options?: ISetCacheOptionsParam
): Promise<ICacheResult> => {
  if (!directory) {
    Console.error('Need provide "directory" param')
    return
  }

  if (!key) {
    Console.error('Need provide "key" param')
    return
  }

  options = {
    isCompress: true,
    status: 'ready',
    expiredTime: DEFAULT_TTL,
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
      const compressed = brotliCompressSync(contentToString)
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

  // Calculate TTL based on expiredTime from content.cache
  // If expiredTime is 'infinite', use 24 hours
  // If expiredTime is a number > 0, use it as TTL
  // Otherwise, use default 5 minutes
  const expiredTime = options.expiredTime
  const ttl = calculateTTL(expiredTime)

  try {
    await redisClient.set(redisKey, JSON.stringify(cacheEntry), 'EX', ttl)
    Console.log(`Redis LRU Cache entry ${redisKey} was updated!`)
  } catch (err) {
    Console.error(err)
    return
  }

  return cacheEntry as unknown as ICacheResult
} // set

export const getData = async (key: string, options?: IGetCacheOptionsParam) => {
  let result

  try {
    result = await get(dataPath, key, 'json', options)
  } catch (err) {
    Console.error(err)
  }

  return result
} // getData

export const getDataCompression = async (
  key: string,
  compression: 'br' | 'gzip'
): Promise<Buffer | undefined> => {
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
    Console.error('Error accessing Redis LRU Cache:', err)
    return undefined
  }
} // getDataCompression

export const setData = async (
  key: string,
  content: string | Buffer | ISetCacheContent,
  options?: ISetCacheOptionsParam
) => {
  let result

  try {
    result = await set(dataPath, key, 'json', content, options)
  } catch (err) {
    Console.error(err)
  }

  return result
} // setData

export const setDataCompression = async (
  key: string,
  content: string | Buffer | ISetCacheContent,
  compression: 'br' | 'gzip',
  options?: ISetCacheOptionsParam
) => {
  let result
  const extension = compression === 'gzip' ? 'gz' : compression

  const redisKey = `${REDIS_PREFIX}${dataPath}/${key}.json`
  const cachedData = await redisClient.get(redisKey)
  const cacheEntry = JSON.parse(cachedData)

  try {
    result = await set(dataPath, `${key}-${compression}`, extension, content, {
      expiredTime: cacheEntry?.cache?.expiredTime,
      ...options,
    })
  } catch (err) {
    Console.error(err)
  }

  return result
} // setDataCompression

export const compressData = async (key, data) => {
  if (!data) return { br: '', gzip: '' }

  const tmpCompressData: { [key: string]: any } = {
    br: '',
    gzip: '',
  }

  try {
    const brottliCompressAsync = promisify(brotliCompress)
    const gzipCompressAsync = promisify(gzip)

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
        setDataCompression(
          key,
          tmpCompressData[compression],
          compression as any
        )
      }
    }
  } catch (err) {
    Console.error(err)
  }

  return tmpCompressData
} // compressData

export const remove = async (
  directory: string,
  key: string,
  extension: 'json' | 'br' | 'gz'
) => {
  if (!directory) {
    Console.error('Need provide "directory" param!')
    return
  }

  if (!key) {
    Console.error('Need provide "key" param!')
    return
  }

  // Create Redis key using the same pattern as get and set
  const redisKey = `${REDIS_PREFIX}${directory}/${key}.${extension}`

  try {
    redisClient.del(redisKey)
    Console.log(`Redis LRU Cache entry ${redisKey} was removed!`)
  } catch (err) {
    Console.error('Error removing Redis LRU Cache entry:', err)
  }
} // remove

export const removeData = async (key: string) => {
  let result

  try {
    result = await Promise.allSettled([
      remove(dataPath, key, 'json'),
      remove(dataPath, `${key}-br`, 'br'),
      remove(dataPath, `${key}-gzip`, 'gz'),
    ])
  } catch (err) {
    Console.error(err)
  }

  return result
} // removeData

export const getStore = async (
  key: string,
  options?: IGetCacheOptionsParam
) => {
  let result

  try {
    result = await get(storePath, key, 'json', options)
  } catch (err) {
    Console.error(err)
  }

  return result
} // getStore

export const setStore = async (key: string, content: any) => {
  let result

  try {
    result = await set(storePath, key, 'json', content, {
      isCompress: false,
    })
  } catch (err) {
    Console.error(err)
  }

  return result
} // setStore

export const removeStore = async (key: string) => {
  let result

  try {
    result = await remove(storePath, key, 'json')
  } catch (err) {
    Console.error(err)
  }

  return result
} // removeStore

export const updateStatus = async (
  directory: string,
  key: string,
  extension: 'json' | 'br' | 'gz',
  newStatus: IStatus
) => {
  if (!directory) {
    Console.error('Need provide "directory" param!')
    return
  }

  if (!key) {
    Console.error('Need provide "key" param!')
    return
  }

  // Create Redis key using the same pattern as get and set
  const redisKey = `${REDIS_PREFIX}${directory}/${key}.${extension}`

  try {
    // Get the current cache entry
    const cachedData = await redisClient.get(redisKey)

    if (!cachedData) {
      Console.error(`Redis cache entry ${redisKey} does not exist!`)
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

    Console.log(`Redis cache entry ${redisKey} status updated to ${newStatus}`)
  } catch (err) {
    Console.error('Error updating Redis cache status:', err)
  }
} // updateStatus

export const updateDataStatus = async (key: string, newStatus?: IStatus) => {
  try {
    updateStatus(dataPath, key, 'br', newStatus)
  } catch (err) {
    Console.error(err)
  }
} // updateDataStatus

export const setRequestTimeInfo = async (file: string, value: unknown) => {
  if (!file || typeof file !== 'string') {
    Console.error('Invalid file key!')
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
      Console.error(`Redis cache entry ${redisKey} does not exist!`)
      return
    }

    const cacheEntry = JSON.parse(cachedData)

    // Convert the value to ISO string for storage
    // value can be Date, timestamp (number), or ISO string
    let requestedAtValue: string
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

    Console.log(
      `Redis cache entry ${redisKey} requestedAt updated to ${requestedAtValue}`
    )
  } catch (err) {
    Console.error('Error updating Redis cache request time:', err)
  }
} // setRequestTimeInfo
