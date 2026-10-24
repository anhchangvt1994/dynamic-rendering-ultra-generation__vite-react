"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var _child_process = require('child_process');
var _fs = require('fs'); var _fs2 = _interopRequireDefault(_fs);
var _net = require('net'); var _net2 = _interopRequireDefault(_net);
var _path = require('path'); var _path2 = _interopRequireDefault(_path);

var _ConsoleHandler = require('../../utils/ConsoleHandler'); var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler);
var _FileHandler = require('../../utils/FileHandler');
var _InitEnv = require('../../utils/InitEnv');
var _PathHandler = require('../../utils/PathHandler');
var _constants = require('../constants');


const HOST = '127.0.0.1'
const DEFAULT_PORT = Number(_InitEnv.PROCESS_ENV.LIGHTPANDA_PORT || 9222)
const MAX_CONNECTIONS = Number(_InitEnv.PROCESS_ENV.LIGHTPANDA_MAX_CONNECTIONS || 32)
const READY_TIMEOUT = 10000
const MAX_RESTART_DELAY = 30000
const userDataPath = _PathHandler.getUserDataPath.call(void 0, )
const pidFilePath = `${userDataPath}/lightpanda.${process.pid}.pid`

// NOTE - Check on HOST, a port checked on "::" can be free there while
// 127.0.0.1:<port> is still used (ex: a lightpanda of an old server process)
const _findFreePort = async (port) => {
  const isFree = await new Promise((res) => {
    const server = _net2.default.createServer()
    server.unref()
    server.once('error', () => res(false))
    server.listen(port, HOST, () => server.close(() => res(true)))
  })

  return isFree ? port : _findFreePort(port + 1)
} // _findFreePort

/**
 * NOTE - Lightpanda is not killed when the server dies by a signal (no "exit"
 * event), so every server writes the pid of its lightpanda to a file and the
 * next launch kills the ones whose server is gone.
 */
const _killOrphanLightpanda = () => {
  let files = []
  try {
    files = _fs2.default.readdirSync(userDataPath)
  } catch (e) {}

  for (const file of files) {
    const ownerPid = Number(_optionalChain([/^lightpanda\.(\d+)\.pid$/, 'access', _ => _.exec, 'call', _2 => _2(file), 'optionalAccess', _3 => _3[1]]))
    if (!ownerPid) continue

    try {
      process.kill(ownerPid, 0)
      continue // NOTE - The owner server is still alive
    } catch (e2) {}

    const filePath = _path2.default.join(userDataPath, file)
    try {
      const pid = Number(_fs2.default.readFileSync(filePath, 'utf8'))
      const command = _child_process.execSync.call(void 0, `ps -p ${pid} -o command=`).toString()
      if (command.includes(_constants.lightpandaPath)) process.kill(pid, 'SIGKILL')
    } catch (e3) {}

    _fs2.default.rmSync(filePath, { force: true })
  }
} // _killOrphanLightpanda

const _waitForReady = async (port) => {
  const startTime = Date.now()

  while (Date.now() - startTime < READY_TIMEOUT) {
    try {
      const res = await fetch(`http://${HOST}:${port}/json/version`)
      if (res.ok) return true
    } catch (e4) {}

    await new Promise((res) => setTimeout(res, 100))
  }

  return false
} // _waitForReady

/**
 * NOTE
 * Lightpanda runs as one long-lived `lightpanda serve` process. Every CDP
 * connection gets its own isolated browser, which is freed when the
 * connection closes, so there is no need to recycle the process every N
 * requests like chromium (no user data dir, no reserve browser).
 */
const LightpandaManager = () => {
  if (!_fs2.default.existsSync(_constants.lightpandaPath)) {
    _ConsoleHandler2.default.error(
      `Lightpanda binary not found at ${_constants.lightpandaPath}. Run "npm run install:lightpanda" or set LIGHTPANDA_PATH.`
    )
    return
  }

  let lightpandaProcess
  let processLaunch
  let browserConnect
  let restartDelay = 1000
  let isExiting = false

  process.once('exit', () => {
    isExiting = true
    _optionalChain([lightpandaProcess, 'optionalAccess', _4 => _4.kill, 'call', _5 => _5('SIGKILL')])
    _fs2.default.rmSync(pidFilePath, { force: true })
  })

  _killOrphanLightpanda()

  const __launch = () => {
    processLaunch = (async () => {
      const port = await _findFreePort(DEFAULT_PORT)
      const wsEndpoint = `ws://${HOST}:${port}`

      _ConsoleHandler2.default.log(`Start lightpanda at ${wsEndpoint}`)

      const child = _child_process.spawn.call(void 0, 
        _constants.lightpandaPath,
        [
          'serve',
          '--host',
          HOST,
          '--port',
          String(port),
          '--cdp-max-connections',
          String(MAX_CONNECTIONS),
          '--disable-metrics',
        ],
        {
          stdio: ['ignore', 'ignore', 'pipe'],
          env: {
            ...process.env,
            LIGHTPANDA_DISABLE_TELEMETRY: 'true',
          },
        }
      )
      lightpandaProcess = child
      _fs2.default.mkdirSync(userDataPath, { recursive: true })
      _fs2.default.writeFileSync(pidFilePath, String(child.pid))

      _optionalChain([child, 'access', _6 => _6.stderr, 'optionalAccess', _7 => _7.on, 'call', _8 => _8('data', (data) => {
        const message = String(data)
        if (message.includes('$level=err') || message.includes('$level=fatal'))
          _ConsoleHandler2.default.error('[lightpanda]', message.trim())
      })])

      child.once('exit', (code, signal) => {
        if (lightpandaProcess === child) {
          lightpandaProcess = undefined
          processLaunch = undefined
          browserConnect = undefined
        }

        if (isExiting) return

        _ConsoleHandler2.default.error(
          `Lightpanda exited (code: ${code}, signal: ${signal}), restart in ${restartDelay}ms`
        )
        setTimeout(() => {
          if (!processLaunch) __launch()
        }, restartDelay)
        restartDelay = Math.min(restartDelay * 2, MAX_RESTART_DELAY)
      })

      if (!(await _waitForReady(port))) {
        _ConsoleHandler2.default.error('Lightpanda is not ready, kill it')
        child.kill('SIGKILL')
        return
      }

      restartDelay = 1000
      _FileHandler.setTextData.call(void 0, _constants.getWsEndpointFilePath.call(void 0, 'lightpanda'), wsEndpoint)
      _ConsoleHandler2.default.log('Start lightpanda success!')

      return wsEndpoint
    })()

    return processLaunch
  } // __launch

  const _get = async () => {
    const wsEndpoint = await (processLaunch || __launch())

    if (!wsEndpoint) return

    if (!browserConnect)
      browserConnect = _constants.puppeteer
        .connect({ browserWSEndpoint: wsEndpoint })
        .then((browser) => {
          browser.once('disconnected', () => {
            browserConnect = undefined
          })
          return browser
        })
        .catch((err) => {
          _ConsoleHandler2.default.error('Failed to connect to lightpanda:', err.message)
          browserConnect = undefined
          return undefined
        })

    return browserConnect
  } // _get

  const _newPage = async () => {
    const browser = await _get()

    return _optionalChain([browser, 'optionalAccess', _9 => _9.newPage, 'call', _10 => _10()])
  } // _newPage

  const _isReady = () => Boolean(lightpandaProcess && !lightpandaProcess.killed)

  __launch()

  return {
    get: _get,
    newPage: _newPage,
    isReady: _isReady,
  }
}

exports. default = LightpandaManager
