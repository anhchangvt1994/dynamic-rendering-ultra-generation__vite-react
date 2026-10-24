import { ChildProcess, execSync, spawn } from 'child_process'
import fs from 'fs'
import net from 'net'
import path from 'path'
import { Browser } from 'puppeteer-core'
import Console from '../../utils/ConsoleHandler'
import { setTextData } from '../../utils/FileHandler'
import { PROCESS_ENV } from '../../utils/InitEnv'
import { getUserDataPath } from '../../utils/PathHandler'
import { getWsEndpointFilePath, lightpandaPath, puppeteer } from '../constants'
import type { IBrowser } from './BrowserManager'

const HOST = '127.0.0.1'
const DEFAULT_PORT = Number(PROCESS_ENV.LIGHTPANDA_PORT || 9222)
const MAX_CONNECTIONS = Number(PROCESS_ENV.LIGHTPANDA_MAX_CONNECTIONS || 32)
const READY_TIMEOUT = 10000
const MAX_RESTART_DELAY = 30000
const userDataPath = getUserDataPath()
const pidFilePath = `${userDataPath}/lightpanda.${process.pid}.pid`

// NOTE - Check on HOST, a port checked on "::" can be free there while
// 127.0.0.1:<port> is still used (ex: a lightpanda of an old server process)
const _findFreePort = async (port: number): Promise<number> => {
  const isFree = await new Promise<boolean>((res) => {
    const server = net.createServer()
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
  let files: string[] = []
  try {
    files = fs.readdirSync(userDataPath)
  } catch {}

  for (const file of files) {
    const ownerPid = Number(/^lightpanda\.(\d+)\.pid$/.exec(file)?.[1])
    if (!ownerPid) continue

    try {
      process.kill(ownerPid, 0)
      continue // NOTE - The owner server is still alive
    } catch {}

    const filePath = path.join(userDataPath, file)
    try {
      const pid = Number(fs.readFileSync(filePath, 'utf8'))
      const command = execSync(`ps -p ${pid} -o command=`).toString()
      if (command.includes(lightpandaPath)) process.kill(pid, 'SIGKILL')
    } catch {}

    fs.rmSync(filePath, { force: true })
  }
} // _killOrphanLightpanda

const _waitForReady = async (port: number) => {
  const startTime = Date.now()

  while (Date.now() - startTime < READY_TIMEOUT) {
    try {
      const res = await fetch(`http://${HOST}:${port}/json/version`)
      if (res.ok) return true
    } catch {}

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
const LightpandaManager = (): IBrowser | undefined => {
  if (!fs.existsSync(lightpandaPath)) {
    Console.error(
      `Lightpanda binary not found at ${lightpandaPath}. Run "npm run install:lightpanda" or set LIGHTPANDA_PATH.`
    )
    return
  }

  let lightpandaProcess: ChildProcess | undefined
  let processLaunch: Promise<string | undefined> | undefined
  let browserConnect: Promise<Browser | undefined> | undefined
  let restartDelay = 1000
  let isExiting = false

  process.once('exit', () => {
    isExiting = true
    lightpandaProcess?.kill('SIGKILL')
    fs.rmSync(pidFilePath, { force: true })
  })

  _killOrphanLightpanda()

  const __launch = () => {
    processLaunch = (async () => {
      const port = await _findFreePort(DEFAULT_PORT)
      const wsEndpoint = `ws://${HOST}:${port}`

      Console.log(`Start lightpanda at ${wsEndpoint}`)

      const child = spawn(
        lightpandaPath,
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
      fs.mkdirSync(userDataPath, { recursive: true })
      fs.writeFileSync(pidFilePath, String(child.pid))

      child.stderr?.on('data', (data) => {
        const message = String(data)
        if (message.includes('$level=err') || message.includes('$level=fatal'))
          Console.error('[lightpanda]', message.trim())
      })

      child.once('exit', (code, signal) => {
        if (lightpandaProcess === child) {
          lightpandaProcess = undefined
          processLaunch = undefined
          browserConnect = undefined
        }

        if (isExiting) return

        Console.error(
          `Lightpanda exited (code: ${code}, signal: ${signal}), restart in ${restartDelay}ms`
        )
        setTimeout(() => {
          if (!processLaunch) __launch()
        }, restartDelay)
        restartDelay = Math.min(restartDelay * 2, MAX_RESTART_DELAY)
      })

      if (!(await _waitForReady(port))) {
        Console.error('Lightpanda is not ready, kill it')
        child.kill('SIGKILL')
        return
      }

      restartDelay = 1000
      setTextData(getWsEndpointFilePath('lightpanda'), wsEndpoint)
      Console.log('Start lightpanda success!')

      return wsEndpoint
    })()

    return processLaunch
  } // __launch

  const _get = async () => {
    const wsEndpoint = await (processLaunch || __launch())

    if (!wsEndpoint) return

    if (!browserConnect)
      browserConnect = puppeteer
        .connect({ browserWSEndpoint: wsEndpoint })
        .then((browser: Browser) => {
          browser.once('disconnected', () => {
            browserConnect = undefined
          })
          return browser
        })
        .catch((err) => {
          Console.error('Failed to connect to lightpanda:', err.message)
          browserConnect = undefined
          return undefined
        })

    return browserConnect
  } // _get

  const _newPage = async () => {
    const browser = await _get()

    return browser?.newPage()
  } // _newPage

  const _isReady = () => Boolean(lightpandaProcess && !lightpandaProcess.killed)

  __launch()

  return {
    get: _get,
    newPage: _newPage,
    isReady: _isReady,
  }
}

export default LightpandaManager
