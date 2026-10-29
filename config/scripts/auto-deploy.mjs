import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  deploy,
  deploymentDiagnostics,
  existingPm2,
  git,
} from '../utils/AutoDeploy.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const hook = process.argv.includes('--hook')
const status = process.argv.includes('--status')
let pm2
try {
  const enabled =
    git(root, ['config', '--bool', '--get', 'app.autoDeploy'], true) !== 'false'
  if (status) {
    pm2 = await existingPm2(root)
    const diagnostics = deploymentDiagnostics(
      root,
      pm2 ? await pm2.list() : [],
      Boolean(pm2)
    )
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
          ...diagnostics,
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
    const diagnostics = deploymentDiagnostics(
      root,
      pm2 ? await pm2.list() : [],
      Boolean(pm2)
    )
    if (!diagnostics.processes.length) {
      const context = `user=${diagnostics.user}, PM2_HOME=${diagnostics.pm2Home}, checkout=${diagnostics.checkout}`
      const reason = !pm2
        ? 'No existing PM2 daemon is reachable'
        : diagnostics.excludedProcesses.length
          ? diagnostics.excludedProcesses
              .map(
                (app) =>
                  `PM2 id ${app.id} (${app.name}): ${app.reason}; cwd=${app.cwd}; script=${app.script}`
              )
              .join('\n')
          : 'The reachable PM2 daemon has no applications'
      const message = `No matching compiled PM2 app (${context}).\n${reason}`
      if (!hook)
        throw new Error(
          `${message}\nRun yarn deploy:status and pm2 ls using the same user/PM2_HOME as the running website. If the app has never been started, build the client and start the production launcher once; see READMORE/auto-deploy.md.`
        )
      console.log(`[auto-deploy] Skipped: ${message}`)
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
