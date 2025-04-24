import Chromium from '@sparticuz/chromium-min'
import path from 'path'
import { Browser, Page } from 'puppeteer-core'
import {
  POWER_LEVEL,
  POWER_LEVEL_LIST,
  SERVER_LESS,
  resourceExtension,
} from '../../constants'
import ServerConfig from '../../server.config'
import { getStore, setStore } from '../../store'
import Console from '../../utils/ConsoleHandler'
import { getTextData, setTextData } from '../../utils/FileHandler'
import { ENV_MODE } from '../../utils/InitEnv'
import { getUserDataPath } from '../../utils/PathHandler'
import WorkerManager from '../../utils/WorkerManager'
import {
  canUseLinuxChromium,
  chromiumPath,
  defaultBrowserOptions,
  puppeteer,
} from '../constants'
const { parentPort, isMainThread } = require('worker_threads')

const userDataPath = getUserDataPath()

export interface IBrowser {
  get: () => Promise<Browser | undefined>
  newPage?: () => Promise<Page | undefined>
  isReady?: () => boolean
}

const workerManager = (() => {
  if (!isMainThread) return

  return WorkerManager.init(
    path.resolve(
      __dirname,
      `../../utils/FollowResource.worker/index.${resourceExtension}`
    ),
    {
      minWorkers: 1,
      maxWorkers: 1,
      enableGlobalCounter: !isMainThread,
    },
    ['deleteResource']
  )
})()

const _deleteUserDataDir = async (dir: string) => {
  if (!workerManager) return
  if (dir) {
    const freePool = await workerManager.getFreePool({
      delay: 250,
    })
    const pool = freePool.pool

    try {
      await pool.exec('deleteResource', [dir])
    } catch (err) {
      Console.error(err)
    }

    freePool.terminate({
      force: true,
    })
  }
} // _deleteUserDataDir

const _getSafePage = (page: Page | undefined) => {
  let SafePage = page

  return () => {
    if (SafePage && SafePage.isClosed()) return
    return SafePage
  }
} // _getSafePage

const _getBrowserForSubThreads = (() => {
  const limit = 3
  let counter = 0
  const _get = async () => {
    if (isMainThread) return

    const wsEndpoint = getTextData(`${userDataPath}/wsEndpoint.txt`)

    if (!wsEndpoint && counter < limit) {
      counter++
      // await new Promise((res) => setTimeout(res, 150))
      return _get()
    }

    const browser = await puppeteer.connect({
      browserWSEndpoint: wsEndpoint,
    })

    if ((!browser || !browser.connected) && counter < limit) {
      counter++
      // await new Promise((res) => setTimeout(res, 150))
      return _get()
    }

    counter = 0

    return browser
  } // get

  return () => _get()
})() // _getBrowserForSubThreads

let browserManager: IBrowser | undefined
function BrowserManager(): IBrowser | undefined {
  if (process.env.PUPPETEER_SKIP_DOWNLOAD && !canUseLinuxChromium) return

  if (browserManager) return browserManager
  else browserManager = this

  if (isMainThread) {
    const userDataDir = () => `${userDataPath}/user_data_${Date.now()}`
    // const strUserDataDir = userDataDir()
    let strUserDataDir: string
    const maxRequestPerBrowser = 10
    let totalRequests = 0
    let browserLaunch: Promise<Browser | undefined>
    let selfUserDataDirPath: string
    let reserveUserDataDirPath: string
    let hasReserveUserDataDirPath = false
    let executablePath: string
    let retryCounter = 0

    const __launch = async (options?: { retry: boolean }) => {
      options = {
        retry: false,
        ...options,
      }

      totalRequests = 0

      if (!options.retry) {
        strUserDataDir = userDataDir()
        selfUserDataDirPath =
          reserveUserDataDirPath ||
          `${strUserDataDir}${ServerConfig.isRemoteCrawler ? '_remote' : ''}`
        reserveUserDataDirPath = `${strUserDataDir}_reserve${
          ServerConfig.isRemoteCrawler ? '_remote' : ''
        }`
      }

      const browserStore = (() => {
        const tmpBrowserStore = getStore('browser')
        return tmpBrowserStore || {}
      })()
      const promiseStore = (() => {
        const tmpPromiseStore = getStore('promise')
        return tmpPromiseStore || {}
      })()

      browserLaunch = new Promise(async (res, rej) => {
        let isError = false
        let promiseBrowser

        if (options.retry) await new Promise((res) => setTimeout(res, 1000))

        try {
          if (canUseLinuxChromium && !promiseStore.executablePath) {
            Console.log('Create executablePath')
            promiseStore.executablePath = Chromium.executablePath(chromiumPath)
          }

          browserStore.userDataPath = selfUserDataDirPath
          browserStore.reserveUserDataPath = reserveUserDataDirPath

          setStore('browser', browserStore)
          setStore('promise', promiseStore)

          if (!executablePath && promiseStore.executablePath) {
            executablePath = await promiseStore.executablePath
          }

          if (promiseStore.executablePath) {
            Console.log('Start browser with executablePath')
            promiseBrowser = puppeteer
              .launch({
                ...defaultBrowserOptions,
                userDataDir: selfUserDataDirPath,
                args: Chromium.args,
                executablePath,
              })
              .catch((err) => {
                Console.log('BrowserManager line 188')
                Console.error(err)
              })

            // NOTE - Create a preventive browser to replace when current browser expired
            if (!options.retry || !hasReserveUserDataDirPath) {
              puppeteer
                .launch({
                  ...defaultBrowserOptions,
                  userDataDir: reserveUserDataDirPath,
                  args: Chromium.args,
                  executablePath,
                })
                .then((reserveBrowser) => {
                  hasReserveUserDataDirPath = true
                  reserveBrowser.close()
                })
                .catch((err) => {
                  hasReserveUserDataDirPath = false
                  Console.log('BrowserManager line 191')
                  Console.error(err)
                })
            }
          } else {
            Console.log('Start browser without executablePath')
            promiseBrowser = puppeteer
              .launch({
                ...defaultBrowserOptions,
                userDataDir: selfUserDataDirPath,
              })
              .catch((err) => {
                Console.log('BrowserManager line 213')
                Console.error(err)
              })

            // NOTE - Create a preventive browser to replace when current browser expired
            if (!options.retry || !hasReserveUserDataDirPath) {
              puppeteer
                .launch({
                  ...defaultBrowserOptions,
                  userDataDir: reserveUserDataDirPath,
                })
                .then((reserveBrowser) => {
                  hasReserveUserDataDirPath = true
                  reserveBrowser.close()
                })
                .catch((err) => {
                  hasReserveUserDataDirPath = false
                  Console.log('BrowserManager line 211')
                  Console.error(err)
                })
            }
          }
        } catch (err) {
          isError = true
          Console.error(err)
        } finally {
          if (isError) return rej(undefined)
          Console.log('Start browser success!')
          res(promiseBrowser)
        }
      })

      if (browserLaunch) {
        try {
          let tabsClosed = 0
          const browser: Browser = (await browserLaunch) as Browser

          browserStore.wsEndpoint = browser.wsEndpoint()
          setStore('browser', browserStore)

          setTextData(`${userDataPath}/wsEndpoint.txt`, browserStore.wsEndpoint)

          // let closePageTimeout: NodeJS.Timeout
          let closeBrowserTimeout: NodeJS.Timeout

          browser.on('closePage', async (url) => {
            tabsClosed++
            const currentWsEndpoint = getStore('browser').wsEndpoint

            if (!SERVER_LESS && currentWsEndpoint !== browser.wsEndpoint()) {
              if (browser.connected)
                try {
                  // if (closePageTimeout) clearTimeout(closePageTimeout)

                  if (closeBrowserTimeout) clearTimeout(closeBrowserTimeout)
                  if (tabsClosed === maxRequestPerBrowser) {
                    browser.close().then(() => {
                      browser.emit('closed', true)
                      Console.log('Browser closed')
                    })
                  } else {
                    closeBrowserTimeout = setTimeout(() => {
                      if (!browser.connected) return
                      browser.close().then(() => {
                        browser.emit('closed', true)
                        Console.log('Browser closed')
                      })
                    }, 60000)
                  }
                } catch (err) {
                  Console.log('BrowserManager line 261')
                  Console.error(err)
                }
            }
            // else {
            // 	if (closePageTimeout) clearTimeout(closePageTimeout)
            // 	closePageTimeout = setTimeout(() => {
            // 		browser.pages().then(async (pages) => {
            // 			if (pages.length) {
            // 				for (const page of pages) {
            // 					if (browser.connected && !page.isClosed()) page.close()
            // 				}
            // 			}
            // 		})
            // 	}, 30000)
            // }
          })

          browser.once('disconnected', () => {
            _deleteUserDataDir(selfUserDataDirPath)
          })
        } catch (err) {
          Console.log('Browser manager line 177:')
          Console.error(err)
        }
      }
    } // __launch()

    if (POWER_LEVEL === POWER_LEVEL_LIST.THREE) {
      __launch()
    }

    const _get = async (options?: { forceLaunch?: boolean }) => {
      options = {
        forceLaunch: false,
        ...options,
      }

      if (!browserLaunch || !_isReady()) {
        await __launch()
      } else if (options.forceLaunch) {
        await __launch({ retry: true })

        retryCounter++
      }

      const browser = await browserLaunch

      if (!browser || !browser.connected) {
        if (retryCounter < 3) {
          return _get({ forceLaunch: true })
        } else {
          retryCounter = 0
          return
        }
      }

      totalRequests++

      return browser as Browser
    } // _get

    const _newPage = async () => {
      try {
        const browser = await _get()

        if (!browser) return

        if (!browser.connected) {
          browser.close()
          __launch()
          return _newPage()
        }

        const page = await browser?.newPage?.()

        if (!page) {
          browser.close()
          __launch()
          return _newPage()
        }

        browser.emit('createNewPage', page)
        return page
      } catch (err) {
        __launch()
        return _newPage()
      }
    } // _newPage

    const _isReady = () => {
      return totalRequests < maxRequestPerBrowser
    } // _isReady

    return {
      get: _get,
      newPage: _newPage,
      isReady: _isReady,
    }
  } else {
    const _get = async () => {
      parentPort.postMessage({
        name: 'getBrowser',
      })
      const browser = await _getBrowserForSubThreads()

      return browser as Browser
    } // _get

    return {
      get: _get,
    }
  }
}

export default () => {
  if (ENV_MODE === 'development') return

  if (browserManager) return browserManager

  browserManager = BrowserManager()
  return browserManager
}
