import fs from 'fs'
import Console from '../../../utils/ConsoleHandler'
import { ISSRResult } from '../../types'
import {
  ICacheSetParams,
  get as getCache,
  getKey as getCacheKey,
  getStatus as getCacheStatus,
  getFileInfo,
  isExist as isCacheExist,
  remove as removeCache,
  rename as renameCache,
  renew as renewCache,
  set as setCache,
} from '../Cache.worker/utils'

const CacheManager = (url: string, cachePath: string) => {
  const get = async () => {
    let result

    try {
      result = await getCache(url, cachePath)
    } catch (err) {
      Console.error(err)
    }

    return result
  } // get

  const achieve = async (): Promise<ISSRResult> => {
    if (!url) {
      Console.error('Need provide "url" param!')
      return
    }

    const key = getCacheKey(url)
    let file = `${cachePath}/${key}.br`
    let isRaw = false

    switch (true) {
      case fs.existsSync(file):
        break
      case fs.existsSync(`${cachePath}/${key}.renew.br`):
        file = `${cachePath}/${key}.renew.br`
        break
      default:
        file = `${cachePath}/${key}.raw.br`
        isRaw = true
        break
    }

    if (!fs.existsSync(file)) return

    const info = await getFileInfo(file)

    if (!info || info.size === 0) return

    // await setRequestTimeInfo(file, new Date())

    return {
      file,
      response: file,
      status: 200,
      createdAt: info.createdAt,
      updatedAt: info.updatedAt,
      requestedAt: new Date(),
      ttRenderMs: 200,
      available: true,
      isInit: false,
      isRaw,
    }
  } // achieve

  const set = async (params: ICacheSetParams) => {
    let result

    try {
      result = setCache(url, cachePath, params)
    } catch (err) {
      Console.error(err)
    }

    return result
  } // set

  const renew = async () => {
    let result

    try {
      result = await renewCache(url, cachePath)
    } catch (err) {
      Console.error(err)
    }

    return result
  } // renew

  const remove = async (options?: { force?: boolean }) => {
    options = {
      force: false,
      ...options,
    }

    if (!options.force) {
      const tmpCacheInfo = await achieve()

      if (tmpCacheInfo) return
    }

    try {
      await removeCache(url, cachePath)
    } catch (err) {
      Console.error(err)
    }
  } // remove

  const rename = async (params?: { type?: 'raw' | 'renew' }) => {
    try {
      await renameCache(url, cachePath, params || {})
    } catch (err) {
      Console.error(err)
    }
  } // rename

  const getStatus = () => {
    return getCacheStatus(url, cachePath)
  } // getStatus

  const isExist = () => {
    return isCacheExist(url, cachePath)
  } // isExist

  return {
    achieve,
    get,
    getStatus,
    set,
    renew,
    remove,
    rename,
    isExist,
  }
}

export default CacheManager
