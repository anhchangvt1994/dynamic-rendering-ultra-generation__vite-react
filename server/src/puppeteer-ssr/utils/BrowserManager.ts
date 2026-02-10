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
const browserActiveList = new Map<string, Browser>([])

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

const _getBrowserForSubThreads = (() => {
  const limit = 3
  let counter = 0
  const _get = async () => {
    if (isMainThread) return

    const wsEndpoint = getTextData(`${userDataPath}/wsEndpoint.txt`)

    if (!wsEndpoint && counter < limit) {
      counter++
      return _get()
    }

    // Return undefined if wsEndpoint is still invalid after retries
    if (!wsEndpoint) {
      counter = 0
      return undefined
    }

    let browser
    try {
      browser = await puppeteer.connect({
        browserWSEndpoint: wsEndpoint,
      })
    } catch (err) {
      Console.error(
        'Failed to connect to browser via WebSocket:',
        err.message || err
      )
      if (counter < limit) {
        counter++
        await new Promise((res) => setTimeout(res, 150))
        return _get()
      }
      counter = 0
      return undefined
    }

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
    let reserveUserDataDirPath: string | null
    let hasReserveUserDataDirPath = false
    let executablePath: string
    let retryTimeout: NodeJS.Timeout | null
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
                  reserveUserDataDirPath = null
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
                  reserveUserDataDirPath = null
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
          browserActiveList.set(browser.wsEndpoint(), browser)

          browserStore.wsEndpoint = browser.wsEndpoint()
          setStore('browser', browserStore)

          setTextData(`${userDataPath}/wsEndpoint.txt`, browserStore.wsEndpoint)

          // let closePageTimeout: NodeJS.Timeout
          let closeBrowserTimeout: NodeJS.Timeout

          browser.on('closePage', async (url) => {
            tabsClosed++
            const currentWsEndpoint = getStore('browser').wsEndpoint

            if (!SERVER_LESS && currentWsEndpoint !== browser.wsEndpoint()) {
              try {
                // if (closePageTimeout) clearTimeout(closePageTimeout)

                if (closeBrowserTimeout) clearTimeout(closeBrowserTimeout)
                if (tabsClosed >= maxRequestPerBrowser) {
                  const pages = await browser.pages()

                  if (pages.length <= 1) {
                    browser?.close?.().then(() => {
                      browser.emit('closed', true)
                      Console.log('Browser closed')
                    })
                    browser.process().kill('SIGKILL')
                  }
                } else {
                  closeBrowserTimeout = setTimeout(async () => {
                    // if (!browser.connected) return
                    const pages = await browser.pages()

                    if (pages.length <= 1) {
                      browser?.close?.().then(() => {
                        browser.emit('closed', true)
                        Console.log('Browser closed')
                      })
                      browser.process().kill('SIGKILL')
                    }
                  }, 30000)
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
      }

      const browser = await browserLaunch

      if (browser) totalRequests++
      else if (!retryTimeout) {
        retryTimeout = setTimeout(() => {
          __launch({ retry: retryCounter < 3 }).finally(() => {
            if (retryTimeout) {
              clearTimeout(retryTimeout)
              retryTimeout = null
            }
          })
        }, 3000)
        retryCounter = retryCounter < 3 ? retryCounter++ : 0
      }

      if (browserActiveList.size > 2) {
        for (const [wsEndpoint, browserActive] of browserActiveList) {
          if (!browserActive) continue

          const pages = await browserActive.pages()

          if (pages.length <= 1) {
            browserActiveList.delete(wsEndpoint)
            browserActive.close()
          }
        }
      }

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
