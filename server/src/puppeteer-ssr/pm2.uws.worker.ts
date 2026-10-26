import chokidar from 'chokidar'
import path from 'path'
import pm2 from 'pm2'
import { resourceDirectory, resourceExtension } from '../constants'
import Console from '../utils/ConsoleHandler'
import { PROCESS_ENV } from '../utils/InitEnv'
import { PM2_PROCESS_NAME } from './constants'

const CLUSTER_INSTANCES = 2
const CLUSTER_KILL_TIMEOUT =
  PROCESS_ENV.CLUSTER_INSTANCES === 'max' ? 7000 : 2000
const runtimeOptions = {
  interpreter: process.execPath,
  node_args:
    '--max-old-space-size=1538' +
    (resourceExtension === 'ts' ? ' --require sucrase/register' : ''),
}

// connect to pm2 daemon
pm2.connect(false, (err) => {
  const selfProcess = process
  if (err) {
    Console.error(err)
    selfProcess.exit(2)
  }

  pm2.list(async function (err, processList) {
    if (err) {
      Console.error(err)
      process.exit(2)
    }

    const existingWorkers = processList.filter(
      (app) =>
        (app.name === 'start-puppeteer-ssr' || app.name === PM2_PROCESS_NAME) &&
        app.pm_id !== undefined
    )
    const hasRestarted = existingWorkers.length > 0
    await Promise.all(
      existingWorkers.map(
        (app) =>
          new Promise<void>((resolve) => {
            // Update persisted PM2 options too, including previously broken workers.
            pm2.restart(
              app.pm_id!,
              { ...runtimeOptions, updateEnv: true },
              // @ts-expect-error PM2 5 types omit the supported restart(id, options, callback) overload.
              (err: Error | null) => {
                if (err) {
                  Console.error(err)
                  selfProcess.exit(2)
                }
                resolve()
              }
            )
          })
      )
    )

    if (!hasRestarted) {
      pm2.start(
        {
          name: PM2_PROCESS_NAME,
          script: `server/${resourceDirectory}/index.uws.worker.${resourceExtension}`,
          ...runtimeOptions,
          instances: CLUSTER_INSTANCES,
          exec_mode: 'cluster',
          wait_ready: true,
          kill_timeout: CLUSTER_KILL_TIMEOUT,
          cwd: '.',
          env: {},
        },
        function (err, apps) {
          if (err) {
            Console.error(err)
            return
          }

          const watcher = chokidar.watch(
            [
              path.resolve(
                __dirname,
                `../../${resourceDirectory}/**/*.${resourceExtension}`
              ),
              path.resolve(
                __dirname,
                `../../${resourceDirectory}/*.${resourceExtension}`
              ),
            ],
            {
              ignored: /$^/,
              ignoreInitial: true,
              persistent: true,
            }
          ) // /$^/ is match nothing

          let timeout
          watcher.on('all', function (files) {
            if (timeout) clearTimeout(timeout)
            timeout = setTimeout(() => {
              pm2.reload(PM2_PROCESS_NAME, () => {})
            }, 3000)
          })
        }
      )
    }
  })
})
