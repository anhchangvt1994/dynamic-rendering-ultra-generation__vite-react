import preflight from '../utils/Preflight.mjs'
import runCommand from '../utils/RunCommand.mjs'

async function runScript() {
  try {
    await preflight()

    await runCommand('node', ['server/server-build.js'])

    await runCommand('./node_modules/.bin/cross-env', [
      'ENV=production',
      'node -r sucrase/register server/dist/index.uws.worker.js',
    ])
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}

runScript()
