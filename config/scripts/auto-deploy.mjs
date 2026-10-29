import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { deploy, existingPm2, git, managedApps } from '../utils/AutoDeploy.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const hook = process.argv.includes('--hook')
const status = process.argv.includes('--status')
let pm2
try {
  const enabled =
    git(root, ['config', '--bool', '--get', 'app.autoDeploy'], true) !== 'false'
  if (status) {
    pm2 = await existingPm2(root)
    const apps = pm2 ? managedApps(await pm2.list(), root) : []
    const hooksPath = git(root, ['config', '--get', 'core.hooksPath'], true)
    let state
    try {
      state = JSON.parse(
        fs.readFileSync(
          path.join(root, '.cache/auto-deploy/state.json'),
          'utf8'
        )
      )
    } catch {
      state = null
    }
    const revision = git(root, ['rev-parse', 'HEAD'])
    console.log(
      JSON.stringify(
        {
          automaticDeployment: enabled && process.env.HUSKY !== '0',
          hooksPath: hooksPath || '(git default)',
          postMergeHook: fs.existsSync(
            path.resolve(root, hooksPath || '.git/hooks', 'post-merge')
          ),
          revision,
          deployedRevision: state?.revision || null,
          upToDate: state?.revision === revision,
          processes: apps.map((app) => ({
            id: app.pm_id,
            name: app.name,
            status: app.pm2_env.status,
          })),
        },
        null,
        2
      )
    )
  } else if (hook && !enabled) {
    console.log(
      '[auto-deploy] Disabled for this checkout (app.autoDeploy=false)'
    )
  } else {
    pm2 = await existingPm2(root)
    if (!pm2 || !managedApps(await pm2.list(), root).length) {
      const message =
        '[auto-deploy] No running compiled PM2 app belongs to this checkout; skipped'
      if (!hook)
        throw new Error(
          `${message}. Start the app first using yarn start:pm2:worker`
        )
      console.log(message)
    } else {
      const result = await deploy({
        root: path.resolve(root),
        pm2,
        fromHook: hook,
        force: !hook,
      })
      if (result.skipped) console.log(`[auto-deploy] ${result.skipped}`)
    }
  }
  pm2?.disconnect()
  // PM2 retains reconnect timers after disconnect. This standalone CLI has
  // completed all builds/reloads and must let git pull return to the shell.
  process.exit(0)
} catch (error) {
  console.error(`[auto-deploy] FAILED: ${error.message}`)
  console.error(
    '[auto-deploy] Fix the error above, then retry with yarn deploy'
  )
  pm2?.disconnect()
  process.exit(1)
}
