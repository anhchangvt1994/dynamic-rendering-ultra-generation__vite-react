"use strict"; function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _chokidar = require('chokidar'); var _chokidar2 = _interopRequireDefault(_chokidar);
var _path = require('path'); var _path2 = _interopRequireDefault(_path);
var _pm2 = require('pm2'); var _pm22 = _interopRequireDefault(_pm2);
var _constants = require('../constants');
var _ConsoleHandler = require('../utils/ConsoleHandler'); var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler);
var _InitEnv = require('../utils/InitEnv');
var _constants3 = require('./constants');
var _ResourceBudget = require('../utils/ResourceBudget');

// Type declarations cannot guarantee that the installed package has this API.
// Check before changing any processes in the existing daemon.
if (typeof _pm22.default.scale !== 'function') {
  _ConsoleHandler2.default.error(
    'PM2 is missing the scale API. Run yarn install --production=false in the project root.'
  )
  process.exit(2)
}

const budget = _ResourceBudget.getResourceBudget.call(void 0, _InitEnv.PROCESS_ENV)
const CLUSTER_INSTANCES = budget.instances
const CLUSTER_KILL_TIMEOUT =
  _InitEnv.PROCESS_ENV.CLUSTER_INSTANCES === 'max' ? 7000 : 2000
const runtimeOptions = {
  interpreter: process.execPath,
  node_args:
    `--max-old-space-size=${budget.nodeHeapMB}` +
    (_constants.resourceExtension === 'ts' ? ' --require sucrase/register' : ''),
  max_memory_restart: `${budget.processMemoryMB}M`,
  env: {
    APP_INSTANCES: String(CLUSTER_INSTANCES),
    REQUEST_WORKERS: String(budget.requestWorkers),
  },
}

// connect to pm2 daemon
_pm22.default.connect(false, (err) => {
  const selfProcess = process
  if (err) {
    _ConsoleHandler2.default.error(err)
    selfProcess.exit(2)
  }

  _pm22.default.list(async function (err, processList) {
    if (err) {
      _ConsoleHandler2.default.error(err)
      process.exit(2)
    }

    const existingWorkers = processList.filter(
      (app) =>
        (app.name === 'start-puppeteer-ssr' || app.name === _constants3.PM2_PROCESS_NAME) &&
        app.pm_id !== undefined
    )
    const hasRestarted = existingWorkers.length > 0
    if (hasRestarted) {
      try {
        const groups = [...new Set(existingWorkers.map((app) => app.name))]
        const primary = groups.includes(_constants3.PM2_PROCESS_NAME)
          ? _constants3.PM2_PROCESS_NAME
          : groups[0]
        for (const name of groups) {
          if (name !== primary)
            await new Promise((resolve, reject) =>
              _pm22.default.delete(name, (error) => (error ? reject(error) : resolve()))
            )
        }
        await new Promise((resolve, reject) => {
          // Environment updates require PM2's ecosystem-object API. Passing
          // env to restart(id, options) is explicitly rejected by PM2.
          _pm22.default.restart(
            {
              apps: [
                {
                  name: primary,
                  script: `server/${_constants.resourceDirectory}/index.uws.worker.${_constants.resourceExtension}`,
                  ...runtimeOptions,
                  instances: CLUSTER_INSTANCES,
                  exec_mode: 'cluster',
                  wait_ready: true,
                  listen_timeout: 45000,
                  kill_timeout: CLUSTER_KILL_TIMEOUT,
                  cwd: '.',
                },
              ],
            } ,
            { updateEnv: true } ,
            // @ts-expect-error PM2 types omit its supported config/options/callback overload.
            (error) => (error ? reject(error) : resolve())
          )
        })
        const current = await new Promise((resolve, reject) =>
          _pm22.default.list((error, apps) => (error ? reject(error) : resolve(apps)))
        )
        // PM2 reports "Same process number" as an error, so skip no-op scale.
        if (
          current.filter((app) => app.name === primary).length !==
          CLUSTER_INSTANCES
        )
          await new Promise((resolve, reject) =>
            _pm22.default.scale(primary, CLUSTER_INSTANCES, (error) =>
              error ? reject(error) : resolve()
            )
          )
      } catch (error) {
        _ConsoleHandler2.default.error(error)
        selfProcess.exit(2)
      }
    }

    if (!hasRestarted) {
      _pm22.default.start(
        {
          name: _constants3.PM2_PROCESS_NAME,
          script: `server/${_constants.resourceDirectory}/index.uws.worker.${_constants.resourceExtension}`,
          ...runtimeOptions,
          instances: CLUSTER_INSTANCES,
          exec_mode: 'cluster',
          wait_ready: true,
          listen_timeout: 45000,
          kill_timeout: CLUSTER_KILL_TIMEOUT,
          cwd: '.',
        },
        function (err) {
          if (err) {
            _ConsoleHandler2.default.error(err)
            return
          }

          // Production deployments reload only after both staged builds succeed.
          // Keep the source watcher for development only.
          if (_constants.resourceExtension !== 'ts') return

          const watcher = _chokidar2.default.watch(
            [
              _path2.default.resolve(
                __dirname,
                `../../${_constants.resourceDirectory}/**/*.${_constants.resourceExtension}`
              ),
              _path2.default.resolve(
                __dirname,
                `../../${_constants.resourceDirectory}/*.${_constants.resourceExtension}`
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
              _pm22.default.reload(_constants3.PM2_PROCESS_NAME, () => {})
            }, 3000)
          })
        }
      )
    }
  })
})
