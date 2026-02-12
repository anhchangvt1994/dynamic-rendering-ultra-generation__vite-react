"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var _chromiummin = require('@sparticuz/chromium-min'); var _chromiummin2 = _interopRequireDefault(_chromiummin);
var _path = require('path'); var _path2 = _interopRequireDefault(_path);





var _constants = require('../../constants');
var _serverconfig = require('../../server.config'); var _serverconfig2 = _interopRequireDefault(_serverconfig);
var _store = require('../../store');
var _ConsoleHandler = require('../../utils/ConsoleHandler'); var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler);
var _FileHandler = require('../../utils/FileHandler');
var _InitEnv = require('../../utils/InitEnv');
var _PathHandler = require('../../utils/PathHandler');
var _WorkerManager = require('../../utils/WorkerManager'); var _WorkerManager2 = _interopRequireDefault(_WorkerManager);





var _constants3 = require('../constants');
const { parentPort, isMainThread } = require('worker_threads')

const userDataPath = _PathHandler.getUserDataPath.call(void 0, )







const workerManager = (() => {
  if (!isMainThread) return

  return _WorkerManager2.default.init(
    _path2.default.resolve(
      __dirname,
      `../../utils/FollowResource.worker/index.${_constants.resourceExtension}`
    ),
    {
      minWorkers: 1,
      maxWorkers: 1,
      enableGlobalCounter: !isMainThread,
    },
    ['deleteResource']
  )
})()

const _deleteUserDataDir = async (dir) => {
  if (!workerManager) return
  if (dir) {
    const freePool = await workerManager.getFreePool({
      delay: 250,
    })
    const pool = freePool.pool

    try {
      await pool.exec('deleteResource', [dir])
    } catch (err) {
      _ConsoleHandler2.default.error(err)
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
    const wsEndpoint = _FileHandler.getTextData.call(void 0, `${userDataPath}/wsEndpoint.txt`)

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
      browser = await _constants3.puppeteer.connect({
        browserWSEndpoint: wsEndpoint,
      })
    } catch (err) {
      _ConsoleHandler2.default.error(
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

let browserManager

function BrowserManager(options

) {
  if (process.env.PUPPETEER_SKIP_DOWNLOAD && !_constants3.canUseLinuxChromium) return

  if (browserManager) return browserManager
  else browserManager = this

  if (!options.isSubThread && isMainThread) {
    const userDataDir = () => `${userDataPath}/user_data_${Date.now()}`
    // const strUserDataDir = userDataDir()
    let strUserDataDir
    const maxRequestPerBrowser = 10
    let totalRequests = 0
    let browserLaunch
    let selfUserDataDirPath
    let reserveUserDataDirPath
    let hasReserveUserDataDirPath = false
    let executablePath
    let retryTimeout
    let retryCounter = 0

    const __launch = async (options) => {
      options = {
        retry: false,
        ...options,
      }
      console.log('launch new browser')

      totalRequests = 0

      if (!options.retry) {
        strUserDataDir = userDataDir()

        selfUserDataDirPath =
          reserveUserDataDirPath ||
          `${strUserDataDir}${_serverconfig2.default.isRemoteCrawler ? '_remote' : ''}`

        reserveUserDataDirPath = `${strUserDataDir}_reserve${
          _serverconfig2.default.isRemoteCrawler ? '_remote' : ''
        }`
      }

      const browserStore = (() => {
        const tmpBrowserStore = _store.getStore.call(void 0, 'browser')
        return tmpBrowserStore || {}
      })()
      const promiseStore = (() => {
        const tmpPromiseStore = _store.getStore.call(void 0, 'promise')
        return tmpPromiseStore || {}
      })()

      browserLaunch = new Promise(async (res, rej) => {
        let isError = false
        let promiseBrowser

        try {
          if (_constants3.canUseLinuxChromium && !promiseStore.executablePath) {
            _ConsoleHandler2.default.log('Create executablePath')
            promiseStore.executablePath = _chromiummin2.default.executablePath(_constants3.chromiumPath)
          }

          browserStore.userDataPath = selfUserDataDirPath
          browserStore.reserveUserDataPath = reserveUserDataDirPath

          _store.setStore.call(void 0, 'browser', browserStore)
          _store.setStore.call(void 0, 'promise', promiseStore)

          if (!executablePath && promiseStore.executablePath) {
            executablePath = await promiseStore.executablePath
          }

          if (promiseStore.executablePath) {
            _ConsoleHandler2.default.log('Start browser with executablePath')
            promiseBrowser = _constants3.puppeteer
              .launch({
                ..._constants3.defaultBrowserOptions,
                userDataDir: selfUserDataDirPath,
                args: _chromiummin2.default.args,
                executablePath,
              })
              .catch((err) => {
                _ConsoleHandler2.default.log('BrowserManager line 188')
                _ConsoleHandler2.default.error(err)
              })

            // NOTE - Create a preventive browser to replace when current browser expired
            if (!options.retry || !hasReserveUserDataDirPath) {
              _constants3.puppeteer
                .launch({
                  ..._constants3.defaultBrowserOptions,
                  userDataDir: reserveUserDataDirPath,
                  args: _chromiummin2.default.args,
                  executablePath,
                })
                .then((reserveBrowser) => {
                  hasReserveUserDataDirPath = true
                  reserveBrowser.close()
                })
                .catch((err) => {
                  reserveUserDataDirPath = null
                  hasReserveUserDataDirPath = false
                  _ConsoleHandler2.default.log('BrowserManager line 191')
                  _ConsoleHandler2.default.error(err)
                })
            }
          } else {
            _ConsoleHandler2.default.log('Start browser without executablePath')
            promiseBrowser = _constants3.puppeteer
              .launch({
                ..._constants3.defaultBrowserOptions,
                userDataDir: selfUserDataDirPath,
              })
              .catch((err) => {
                _ConsoleHandler2.default.log('BrowserManager line 213')
                _ConsoleHandler2.default.error(err)
              })

            // NOTE - Create a preventive browser to replace when current browser expired
            if (!options.retry || !hasReserveUserDataDirPath) {
              _constants3.puppeteer
                .launch({
                  ..._constants3.defaultBrowserOptions,
                  userDataDir: reserveUserDataDirPath,
                })
                .then((reserveBrowser) => {
                  hasReserveUserDataDirPath = true
                  reserveBrowser.close()
                })
                .catch((err) => {
                  reserveUserDataDirPath = null
                  hasReserveUserDataDirPath = false
                  _ConsoleHandler2.default.log('BrowserManager line 211')
                  _ConsoleHandler2.default.error(err)
                })
            }
          }
        } catch (err) {
          isError = true
          _ConsoleHandler2.default.error(err)
        } finally {
          if (isError) return rej(undefined)
          _ConsoleHandler2.default.log('Start browser success!')
          res(promiseBrowser)
        }
      })

      if (browserLaunch) {
        try {
          let tabsClosed = 0
          const browser = (await browserLaunch) 
          const outdateBrowser = _store.getStore.call(void 0, 'outdateBrowser')

          if (browserStore.wsEndpoint) {
            outdateBrowser.add(browserStore.wsEndpoint)

            _store.setStore.call(void 0, 'outdateBrowser', outdateBrowser)
          }

          browserStore.wsEndpoint = browser.wsEndpoint()
          _store.setStore.call(void 0, 'browser', browserStore)

          _FileHandler.setTextData.call(void 0, `${userDataPath}/wsEndpoint.txt`, browserStore.wsEndpoint)

          // let closePageTimeout: NodeJS.Timeout
          let closeBrowserTimeout

          browser.on('closePage', async (url) => {
            tabsClosed++

            if (browser.connected)
              try {
                if (closeBrowserTimeout) clearTimeout(closeBrowserTimeout)
                if (tabsClosed === maxRequestPerBrowser) {
                  browser.close().then(() => {
                    browser.emit('closed', true)
                    _ConsoleHandler2.default.log('Browser closed')
                    if (
                      !_optionalChain([browser, 'optionalAccess', _ => _.connected]) &&
                      outdateBrowser.has(browser.wsEndpoint())
                    ) {
                      outdateBrowser.delete(browser.wsEndpoint())
                      _store.setStore.call(void 0, 'outdateBrowser', outdateBrowser)
                    }
                  })
                }
              } catch (err) {
                _ConsoleHandler2.default.log('BrowserManager line 261')
                _ConsoleHandler2.default.error(err)
              }
          })

          browser.once('disconnected', () => {
            console.log('disconnect')
            _deleteUserDataDir(selfUserDataDirPath)
          })
        } catch (err) {
          _ConsoleHandler2.default.log('Browser manager line 177:')
          _ConsoleHandler2.default.error(err)
        }
      }
    } // __launch()

    if (_constants.POWER_LEVEL === _constants.POWER_LEVEL_LIST.THREE) {
      __launch()
    }

    const _get = async (options) => {
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

      return browser 
    } // _get

    const _newPage = async () => {
      try {
        const browser = await _get()

        if (!browser) return

        if (!browser.connected) {
          browser.close()
          browser.process().kill('SIGKILL')
          __launch()
          return _newPage()
        }

        const page = await _optionalChain([browser, 'optionalAccess', _2 => _2.newPage, 'optionalCall', _3 => _3()])

        if (!page) {
          browser.close()
          browser.process().kill('SIGKILL')
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
      _optionalChain([parentPort, 'optionalAccess', _4 => _4.postMessage, 'call', _5 => _5({
        name: 'getBrowser',
      })])
      const browser = await _getBrowserForSubThreads()

      return browser 
    } // _get

    return {
      get: _get,
    }
  }
}

exports. default = (options) => {
  if (_InitEnv.ENV_MODE === 'development') return

  if (browserManager) return browserManager

  const _options = {
    isSubThread: false,
    ...(options || {}),
  }

  browserManager = BrowserManager(_options)
  return browserManager
}
