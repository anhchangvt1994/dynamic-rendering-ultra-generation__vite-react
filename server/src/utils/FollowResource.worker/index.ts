import fs from 'fs'
import fsExtra from 'fs-extra'
import path from 'path'
import WorkerPool from 'workerpool'

import { brotliDecompressSync } from 'zlib'
import { puppeteer } from '../../puppeteer-ssr/constants'
import ServerConfig from '../../server.config'
import Console from '../ConsoleHandler'
import { getTextData } from '../FileHandler'
import { deleteResource as deleteResourceWithWorker } from './utils'

type IFileInfo =
  | {
      size: number
      createdAt: number
      updatedAt: number
      requestedAt: number
    }
  | undefined

const deleteResource = (path: string) => {
  deleteResourceWithWorker(path)
} //  deleteResource

const copyResource = (
  path: string,
  targetPath: string,
  opts: { [key: string]: any }
) => {
  // Validate paths to prevent TypeError
  if (!path || typeof path !== 'string') {
    Console.error('Path can not empty!')
    return
  }

  if (!targetPath || typeof targetPath !== 'string') {
    Console.error('Target path can not empty!')
    return
  }

  try {
    fsExtra.emptyDirSync(targetPath)
    fsExtra.copySync(path, targetPath)
  } catch (err) {
    Console.error(err)
  }
} // copyResource

const getFileInfo = async (file: string): Promise<IFileInfo> => {
  if (!file) {
    Console.error('Need provide "file" param!')
    return
  }

  const result = await new Promise<IFileInfo>((res) => {
    fs.stat(file, (err, stats) => {
      if (err) {
        Console.error(err)
        res(undefined)
        return
      }

      res({
        size: stats.size,
        createdAt: stats.birthtimeMs,
        updatedAt: stats.mtimeMs,
        requestedAt: stats.atimeMs,
      })
    })
  })

  return result
} // getFileInfo

export interface ICheckToCleanFileOptionsParam {
  schedule?: number
  validRequestAtDuration?: number
}

export type ICheckToCleanResult = boolean | 'update'

const checkToCleanFile = async (
  file: string,
  { schedule, validRequestAtDuration }: ICheckToCleanFileOptionsParam
): Promise<ICheckToCleanResult> => {
  if (!file) {
    Console.error('Need provide "file" to delete!')
    return false
  }

  schedule = schedule || 30000

  const result = await new Promise(async (res) => {
    file = fs.existsSync(file) ? file : file.replace('.raw', '')
    if (fs.existsSync(file)) {
      const info = await getFileInfo(file)
      validRequestAtDuration =
        validRequestAtDuration || (schedule as number) / 2

      if (!info) {
        // WorkerPool.pool().terminate()
        return res(false)
      }

      const curTime = Date.now()
      const requestedAt = new Date(info.requestedAt).getTime()
      const updatedAt = new Date(info.updatedAt).getTime()
      const duration =
        curTime - (requestedAt > updatedAt ? requestedAt : updatedAt)

      if (duration > validRequestAtDuration) {
        let unlinkFinish = true
        try {
          deleteResource(file)
          Console.log(`File ${file} was permanently deleted`)
        } catch (err) {
          Console.error(err)
          unlinkFinish = false
        }

        return res(unlinkFinish)
      } else {
        return res('update')
      }
    }
  })

  return result as ICheckToCleanResult
  // WorkerPool.pool().terminate()
} // checkToCleanFile

const scanToCleanBrowsers = async (
  dirPath: string,
  expiredTime = 1,
  browserStore
) => {
  if (fs.existsSync(dirPath)) {
    let browserList

    try {
      browserList = fs.readdirSync(dirPath)
    } catch (err) {
      Console.error(err)
    }

    const curUserDataPath = browserStore.userDataPath
      ? path.join('', browserStore.userDataPath)
      : ''
    const reserveUserDataPath = browserStore.reserveUserDataPath
      ? path.join('', browserStore.reserveUserDataPath)
      : ''

    for (const file of browserList) {
      const absolutePath = path.join(dirPath, file)

      if (file === 'wsEndpoint.txt') continue

      if (
        absolutePath === curUserDataPath ||
        absolutePath === reserveUserDataPath
      ) {
        continue
      }

      const dirExistTimeInMinutes =
        (Date.now() - new Date(fs.statSync(absolutePath).mtime).getTime()) /
        60000

      if (dirExistTimeInMinutes >= expiredTime) {
        // NOTE - Remove without check pages
        try {
          deleteResource(absolutePath)
        } catch (err) {
          Console.error(err)
        }
      }
    }
  }
} // scanToCleanBrowsers

const scanToCleanOutdateBrowsers = async (outdateBrowser) => {
  if (!outdateBrowser || !outdateBrowser.length) return

  for (const wsEndpoint of outdateBrowser) {
    if (!wsEndpoint) continue

    try {
      const browser = puppeteer.connect({ browserWSEndpoint: wsEndpoint })

      if (browser && browser.connected) {
        browser.close()
      }
    } catch {
      continue
    }
  }
} // scanToCleanOutdateBrowsers

const scanToCleanPages = (dirPath: string) => {
  if (fs.existsSync(dirPath)) {
    let pageList

    try {
      pageList = fs.readdirSync(`${dirPath}`)
    } catch (err) {
      Console.error(err)
      return
    }

    for (const file of pageList) {
      if (file === 'info') continue

      const infoFilePath = path.join(dirPath, `/info/${file.split('.')[0]}.txt`)
      const url = getTextData(infoFilePath)

      if (!url) continue

      const urlInfo = new URL(url)

      const cacheOption = (
        ServerConfig.crawl.custom?.(url) ??
        ServerConfig.crawl.routes[urlInfo.pathname] ??
        ServerConfig.crawl
      ).cache

      const expiredTime = cacheOption.time

      if (expiredTime === 'infinite') {
        continue
      }

      const cacheFilePath = path.join(dirPath, file)
      const dirExistTimeInMinutes =
        (Date.now() - new Date(fs.statSync(cacheFilePath).atime).getTime()) /
        1000

      if (dirExistTimeInMinutes >= expiredTime) {
        try {
          Promise.all([
            fs.unlinkSync(cacheFilePath),
            fs.unlinkSync(infoFilePath),
          ])
        } catch (err) {
          Console.error(err)
        }
      }
    }
  }
  // else {
  // res(null)
  // }
} // scanToCleanPages

const scanToCleanViews = (
  dirPath: string,
  options: {
    forceToClean?: boolean
  }
) => {
  if (fs.existsSync(dirPath)) {
    let viewList

    try {
      viewList = fs.readdirSync(`${dirPath}`)
    } catch (err) {
      Console.error(err)
      return
    }

    options = {
      forceToClean: false,
      ...options,
    }

    for (const file of viewList) {
      if (file.endsWith('--loader.br') || file === 'info') continue

      const infoFilePath = path.join(dirPath, `/info/${file.split('.')[0]}.txt`)
      const url = getTextData(infoFilePath)

      if (!url) continue

      const urlInfo = new URL(url)

      const routeOptions =
        ServerConfig.routes.list?.[urlInfo.pathname] ??
        ServerConfig.routes.custom?.(url) ??
        (ServerConfig.routes as any)?.preview

      const expiredTime = (routeOptions.preview || routeOptions.pointsTo)?.time

      if (!expiredTime || expiredTime === 'infinite') {
        continue
      }

      const cacheFilePath = path.join(dirPath, file)
      const dirExistTimeInMinutes =
        (Date.now() - new Date(fs.statSync(cacheFilePath).atime).getTime()) /
        1000

      if (
        options.forceToClean ||
        (!expiredTime && dirExistTimeInMinutes >= 300) ||
        dirExistTimeInMinutes >= expiredTime
      ) {
        try {
          Promise.all([
            fs.unlinkSync(cacheFilePath),
            fs.unlinkSync(infoFilePath),
          ])
        } catch (err) {
          Console.error(err)
        }
      }
    }
  }
} // scanToCleanViews

const scanToCleanAPIDataCache = async (dirPath: string) => {
  if (!dirPath) {
    Console.error('You need to provide dirPath param!')
    return
  }

  let apiCacheList

  try {
    apiCacheList = fs.readdirSync(dirPath)
  } catch (err) {
    Console.error(err)
    return
  }

  if (!apiCacheList || !apiCacheList.length) return

  const chunkSize = 50

  const arrPromise: Promise<string>[] = []
  const curTime = Date.now()

  for (let i = 0; i < apiCacheList.length; i += chunkSize) {
    arrPromise.push(
      new Promise(async (resolve) => {
        let timeout
        const arrChunked = apiCacheList.slice(i, i + chunkSize)
        for (const item of arrChunked) {
          if (item.includes('.fetch')) continue

          const absolutePath = path.join(dirPath, item)

          if (/\-(br|gzip)/.test(absolutePath)) continue

          if (!fs.existsSync(absolutePath)) continue
          const fileInfo = await getFileInfo(absolutePath)

          if (!fileInfo?.size) continue

          const fileContent = (() => {
            try {
              const tmpContent = fs.readFileSync(absolutePath)

              return JSON.parse(brotliDecompressSync(tmpContent).toString())
            } catch (err) {
              Console.error(`Failed to decompress file ${absolutePath}:`, err)
              return null
            }
          })()

          // Skip if decompression failed
          if (!fileContent) continue

          const expiredTime = fileContent.cache
            ? fileContent.cache.expiredTime
            : 60000

          if (
            curTime - new Date(fileInfo.requestedAt).getTime() >=
            expiredTime
          ) {
            if (timeout) clearTimeout(timeout)

            fs.unlink(absolutePath, (err) => {
              if (err) {
                Console.error(err)
                return
              }

              timeout = setTimeout(() => {
                resolve('complete')
              }, 100)
            })

            const absolutePathWithBr = absolutePath.replace('.br', '-br.br')

            if (fs.existsSync(absolutePathWithBr)) {
              fs.unlink(absolutePathWithBr, (err) => {
                if (err) {
                  Console.error(err)
                }
              })
            }

            const absolutePathWithGzip = absolutePath.replace('.br', '-gzip.gz')
            if (fs.existsSync(absolutePathWithGzip)) {
              fs.unlink(absolutePathWithGzip, (err) => {
                if (err) {
                  Console.error(err)
                }
              })
            }
          }
        }

        if (timeout) clearTimeout(timeout)
        timeout = setTimeout(() => {
          resolve('complete')
        }, 100)
      })
    )
  }

  await Promise.all(arrPromise)

  return 'complete'
} // scanToCleanAPIDataCache

const scanToCleanAPIStoreCache = async (dirPath: string) => {
  if (!dirPath) {
    Console.error('You need to provide dirPath param!')
    return
  }

  let apiCacheList

  try {
    apiCacheList = fs.readdirSync(dirPath)
  } catch (err) {
    Console.error(err)
    return
  }

  if (!apiCacheList || !apiCacheList.length) return

  const chunkSize = 50

  const arrPromise: Promise<string>[] = []
  const curTime = Date.now()

  for (let i = 0; i < apiCacheList.length; i += chunkSize) {
    arrPromise.push(
      new Promise(async (resolve) => {
        let timeout
        const arrChunked = apiCacheList.slice(i, i + chunkSize)
        for (const item of arrChunked) {
          const absolutePath = path.join(dirPath, item)

          if (!fs.existsSync(absolutePath)) continue
          const fileInfo = await getFileInfo(absolutePath)

          if (!fileInfo?.size) continue

          if (curTime - new Date(fileInfo.requestedAt).getTime() >= 300000) {
            if (timeout) clearTimeout(timeout)
            try {
              fs.unlink(absolutePath, () => {})
            } catch (err) {
              Console.error(err)
            } finally {
              timeout = setTimeout(() => {
                resolve('complete')
              }, 100)
            }
          }
        }

        if (timeout) clearTimeout(timeout)
        timeout = setTimeout(() => {
          resolve('complete')
        }, 100)
      })
    )
  }

  await Promise.all(arrPromise)

  return 'complete'
} // scanToCleanAPIStoreCache

WorkerPool.worker({
  checkToCleanFile,
  scanToCleanBrowsers,
  scanToCleanOutdateBrowsers,
  scanToCleanPages,
  scanToCleanViews,
  scanToCleanAPIDataCache,
  scanToCleanAPIStoreCache,
  deleteResource,
  copyResource,
  finish: () => {
    return 'finish'
  },
})
