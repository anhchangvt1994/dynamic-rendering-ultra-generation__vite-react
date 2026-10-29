import chokidar from 'chokidar'
import path from 'path'
import pm2 from 'pm2'
import { resourceDirectory, resourceExtension } from '../constants'
import Console from '../utils/ConsoleHandler'
import { PROCESS_ENV } from '../utils/InitEnv'
import { PM2_PROCESS_NAME } from './constants'
import { getResourceBudget } from '../utils/ResourceBudget'

// Type declarations cannot guarantee that the installed package has this API.
// Check before changing any processes in the existing daemon.
if (typeof pm2.scale !== 'function') {
  Console.error(
    'PM2 is missing the scale API. Run yarn install --production=false in the project root.'
  )
  process.exit(2)
}

const budget = getResourceBudget(PROCESS_ENV)
const CLUSTER_INSTANCES = budget.instances
const CLUSTER_KILL_TIMEOUT =
  PROCESS_ENV.CLUSTER_INSTANCES === 'max' ? 7000 : 2000
const runtimeOptions = {
  interpreter: process.execPath,
  node_args:
    `--max-old-space-size=${budget.nodeHeapMB}` +
    (resourceExtension === 'ts' ? ' --require sucrase/register' : ''),
  max_memory_restart: `${budget.processMemoryMB}M`,
  env: {
    APP_INSTANCES: String(CLUSTER_INSTANCES),
    REQUEST_WORKERS: String(budget.requestWorkers),
  },
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
    if (hasRestarted) {
      try {
        const groups = [...new Set(existingWorkers.map((app) => app.name!))]
        const primary = groups.includes(PM2_PROCESS_NAME)
          ? PM2_PROCESS_NAME
          : groups[0]
        for (const name of groups) {
          if (name !== primary)
            await new Promise<void>((resolve, reject) =>
              pm2.delete(name, (error) => (error ? reject(error) : resolve()))
            )
        }
        await new Promise<void>((resolve, reject) => {
          // Environment updates require PM2's ecosystem-object API. Passing
          // env to restart(id, options) is explicitly rejected by PM2.
          pm2.restart(
            {
              apps: [
                {
                  name: primary,
                  script: `server/${resourceDirectory}/index.uws.worker.${resourceExtension}`,
                  ...runtimeOptions,
                  instances: CLUSTER_INSTANCES,
                  exec_mode: 'cluster',
                  wait_ready: true,
                  kill_timeout: CLUSTER_KILL_TIMEOUT,
                  cwd: '.',
                },
              ],
            } as any,
            { updateEnv: true } as any,
            // @ts-expect-error PM2 types omit its supported config/options/callback overload.
            (error: Error | null) => (error ? reject(error) : resolve())
          )
        })
        const current = await new Promise<any[]>((resolve, reject) =>
          pm2.list((error, apps) => (error ? reject(error) : resolve(apps)))
        )
        // PM2 reports "Same process number" as an error, so skip no-op scale.
        if (
          current.filter((app) => app.name === primary).length !==
          CLUSTER_INSTANCES
        )
          await new Promise<void>((resolve, reject) =>
            pm2.scale(primary, CLUSTER_INSTANCES, (error) =>
              error ? reject(error) : resolve()
            )
          )
      } catch (error) {
        Console.error(error)
        selfProcess.exit(2)
      }
    }

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
        },
        function (err) {
          if (err) {
            Console.error(err)
            return
          }

          // Production deployments reload only after both staged builds succeed.
          // Keep the source watcher for development only.
          if (resourceExtension !== 'ts') return

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
          watcher.on('all', function () {
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
