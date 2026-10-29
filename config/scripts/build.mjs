import { spawn } from 'node:child_process'

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: false })
    child.once('error', reject)
    child.once('close', (code, signal) => {
      if (code === 0) resolve()
      else
        reject(new Error(`${command} exited with ${signal || `code ${code}`}`))
    })
  })
}

async function runScript() {
  try {
    await runCommand(process.execPath, [
      '-r',
      'sucrase/register',
      'server/src/utils/BeforeBuildHandler.ts',
    ])

    const checks = await Promise.allSettled([
      runCommand('./node_modules/.bin/tsc', [
        '--incremental',
        '--tsBuildInfoFile',
        'node_modules/.cache/build-tsconfig.tsbuildinfo',
      ]),
      runCommand('./node_modules/.bin/eslint', [
        'src/**/*.{t,j}s{,x}',
        '--no-error-on-unmatched-pattern',
        '--quiet',
        '--cache',
        '--cache-strategy',
        'content',
        '--cache-location',
        'node_modules/.cache/build-eslint',
      ]),
    ])
    const failedCheck = checks.find((result) => result.status === 'rejected')
    if (failedCheck) throw failedCheck.reason

    const staging = process.env.DEPLOY_STAGING_DIR
    await runCommand('./node_modules/.bin/vite', [
      'build',
      ...(staging ? ['--outDir', `${staging}/dist`] : []),
    ])

    if (!staging)
      await runCommand(process.execPath, [
        '-r',
        'sucrase/register',
        'server/src/utils/AfterBuildHandler.ts',
      ])
  } catch (err) {
    console.error(err.message)
    process.exitCode = 1
  }
}

runScript()
