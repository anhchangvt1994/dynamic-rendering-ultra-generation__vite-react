"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _chromiummin = require('@sparticuz/chromium-min'); var _chromiummin2 = _interopRequireDefault(_chromiummin);
var _path = require('path'); var _path2 = _interopRequireDefault(_path);
var _constants = require('../../constants');



var _constants3 = require('../../puppeteer-ssr/constants');
var _store = require('../../store');
var _ConsoleHandler = require('../ConsoleHandler'); var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler);
var _InitEnv = require('../InitEnv');







var _PathHandler = require('../PathHandler');
var _WorkerManager = require('../WorkerManager'); var _WorkerManager2 = _interopRequireDefault(_WorkerManager);

const pagesPath = _PathHandler.getPagesPath.call(void 0, )
const viewsPath = _PathHandler.getViewsPath.call(void 0, )
const dataPath = _PathHandler.getDataPath.call(void 0, )
const storePath = _PathHandler.getStorePath.call(void 0, )
const userDataPath = _PathHandler.getUserDataPath.call(void 0, )
const workerManagerPath = _PathHandler.getWorkerManagerPath.call(void 0, )

const { isMainThread } = require('worker_threads')

const workerManager = (() => {
  if (!isMainThread) return
  return _WorkerManager2.default.init(
    _path2.default.resolve(
      __dirname,
      `../FollowResource.worker/index.${_constants.resourceExtension}`
    ),
    {
      minWorkers: 1,
      maxWorkers: 5,
    },
    [
      'scanToCleanBrowsers',
      'scanToCleanOutdateBrowsers',
      'scanToCleanPages',
      'scanToCleanViews',
      'scanToCleanAPIDataCache',
      'deleteResource',
      'copyResource',
    ]
  )
})()

 const cleanBrowsers = (() => {
  let executablePath
  return async (
    expiredTime = _InitEnv.PROCESS_ENV.RESET_RESOURCE
      ? 0
      : process.env.MODE === 'development'
        ? 0
        : 60
  ) => {
    if (!isMainThread || process.env.DISABLE_INTERNAL_CRAWLER || !workerManager)
      return

    const browserStore = (() => {
      const tmpBrowserStore = _store.getStore.call(void 0, 'browser')
      return tmpBrowserStore || {}
    })()
    const promiseStore = (() => {
      const tmpPromiseStore = _store.getStore.call(void 0, 'promise')
      return tmpPromiseStore || {}
    })()

    if (_constants3.canUseLinuxChromium && !promiseStore.executablePath) {
      _ConsoleHandler2.default.log('Create executablePath')
      promiseStore.executablePath = _chromiummin2.default.executablePath(_constants3.chromiumPath)
    }

    _store.setStore.call(void 0, 'browser', browserStore)
    _store.setStore.call(void 0, 'promise', promiseStore)

    if (!executablePath && promiseStore.executablePath) {
      executablePath = await promiseStore.executablePath
    }

    const freePool = await workerManager.getFreePool()
    const pool = freePool.pool

    browserStore.executablePath = executablePath

    try {
      await pool.exec('scanToCleanBrowsers', [
        userDataPath,
        expiredTime,
        browserStore,
      ])
    } catch (err) {
      _ConsoleHandler2.default.error(err)
    }

    freePool.terminate({
      force: true,
    })

    if (!_constants.SERVER_LESS)
      setTimeout(() => {
        exports.cleanBrowsers.call(void 0, 5)
      }, 300000)
  }
})(); exports.cleanBrowsers = cleanBrowsers // cleanBrowsers

 const cleanOutdateBrowsers = (() => {
  return async () => {
    const outdateBrowser = _store.getStore.call(void 0, 'outdateBrowser')

    if (!outdateBrowser || !outdateBrowser.size) return

    const freePool = await workerManager.getFreePool()
    const pool = freePool.pool

    try {
      await pool.exec('scanToCleanBrowsers', Array.from(outdateBrowser))
    } catch (err) {
      _ConsoleHandler2.default.error(err)
    }

    freePool.terminate({
      force: true,
    })

    if (!_constants.SERVER_LESS)
      setTimeout(() => {
        exports.cleanOutdateBrowsers.call(void 0, )
      }, 10000)
  }
})(); exports.cleanOutdateBrowsers = cleanOutdateBrowsers // cleanOutdateBrowsers

 const cleanPages = (() => {
  return async () => {
    if (!isMainThread || !workerManager) return

    const freePool = await workerManager.getFreePool()
    const pool = freePool.pool

    try {
      await pool.exec('scanToCleanPages', [pagesPath])
    } catch (err) {
      _ConsoleHandler2.default.error(err)
    }

    freePool.terminate({
      force: true,
    })

    if (!_constants.SERVER_LESS) {
      setTimeout(() => {
        exports.cleanPages.call(void 0, )
      }, 1800000)
    }
  }
})(); exports.cleanPages = cleanPages // cleanPages

 const cleanViews = (() => {
  // let cleanViewsTimeout: NodeJS.Timeout
  // let distFilesChangedTimeout: NodeJS.Timeout
  // let isDistChanging: boolean = false

  // ;(() => {
  // 	if (!isMainThread || !workerManager) return

  // try {
  // 	fs.emptyDirSync(path.resolve(__dirname, '../../../resources'))
  // 	fs.copySync(
  // 		path.resolve(__dirname, '../../../../dist'),
  // 		path.resolve(__dirname, '../../../resources')
  // 	)
  // } catch (err) {
  // 	Console.error(err)
  // }

  // const watcher = chokidar.watch(
  // 	[
  // 		path.resolve(__dirname, '../../../../dist/**/*'),
  // 		path.resolve(__dirname, '../../../../dist/*'),
  // 	],
  // 	{
  // 		ignored: /$^/,
  // 		persistent: true,
  // 	}
  // ) // /$^/ is match nothing

  // watcher.on('change', function () {
  // 	if (isDistChanging) return
  // 	isDistChanging = true

  // 	if (cleanViewsTimeout) {
  // 		clearTimeout(cleanViewsTimeout)
  // 	}

  // 	if (distFilesChangedTimeout) {
  // 		clearTimeout(distFilesChangedTimeout)
  // 	}

  // 	distFilesChangedTimeout = setTimeout(async () => {
  // 		const freePool = await workerManager.getFreePool()
  // 		const pool = freePool.pool

  // 		try {
  // 			await pool.exec('deleteResource', [viewsPath])
  // 		} catch (err) {
  // 			Console.error(err)
  // 		}

  // 		isDistChanging = false
  // 		cleanViewsTimeout = setTimeout(() => {
  // 			cleanViews()
  // 		}, 300000)

  // 		freePool.terminate({
  // 			force: true,
  // 		})
  // 	}, 1000)
  // })
  // })()

  return async (options) => {
    if (!isMainThread || !workerManager) return

    const freePool = await workerManager.getFreePool()
    const pool = freePool.pool

    try {
      options = {
        forceToClean: false,
        ...options,
      }
      await pool.exec('scanToCleanViews', [viewsPath, options])
    } catch (err) {
      _ConsoleHandler2.default.error(err)
    }

    freePool.terminate({
      force: true,
    })

    if (!_constants.SERVER_LESS) {
      setTimeout(() => {
        exports.cleanViews.call(void 0, )
      }, 300000)
    }
  }
})(); exports.cleanViews = cleanViews // cleanViews

 const cleanAPIDataCache = (() => {
  return async () => {
    if (!isMainThread || !workerManager) return

    const freePool = await workerManager.getFreePool()
    const pool = freePool.pool

    try {
      await pool.exec('scanToCleanAPIDataCache', [dataPath])
    } catch (err) {
      _ConsoleHandler2.default.error(err)
    }

    freePool.terminate({
      force: true,
    })

    if (!_constants.SERVER_LESS) {
      setTimeout(() => {
        exports.cleanAPIDataCache.call(void 0, )
      }, 30000)
    }
  }
})(); exports.cleanAPIDataCache = cleanAPIDataCache // cleanAPIDataCache

 const cleanAPIStoreCache = (() => {
  return async () => {
    if (!isMainThread || !workerManager) return

    const freePool = await workerManager.getFreePool()
    const pool = freePool.pool

    try {
      await pool.exec('scanToCleanAPIStoreCache', [storePath])
    } catch (err) {
      _ConsoleHandler2.default.error(err)
    }

    freePool.terminate({
      force: true,
    })

    if (!_constants.SERVER_LESS) {
      setTimeout(() => {
        exports.cleanAPIStoreCache.call(void 0, )
      }, 30000)
    }
  }
})(); exports.cleanAPIStoreCache = cleanAPIStoreCache // cleanAPIStoreCache

 const cleanOther = (() => {
  return async () => {
    if (!isMainThread || !workerManager) return

    const clean = async (path) => {
      if (!path) return

      const freePool = await workerManager.getFreePool()
      const pool = freePool.pool

      try {
        pool.exec('deleteResource', [path])
      } catch (err) {
        _ConsoleHandler2.default.error(err)
      }

      freePool.terminate({
        force: true,
      })
    }

    try {
      await Promise.all([
        clean(`${userDataPath}/wsEndpoint.txt`),
        clean(`${workerManagerPath}/counter.txt`),
      ])
    } catch (err) {
      _ConsoleHandler2.default.error(err)
    }
  }
})(); exports.cleanOther = cleanOther
