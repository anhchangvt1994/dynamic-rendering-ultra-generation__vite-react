import runCommand from '../utils/RunCommand.mjs'

async function runScript() {
  try {
    await runCommand('node', ['server/server-build.js'])

    await runCommand('./node_modules/.bin/cross-env', [
      'ENV=production',
      'node -r sucrase/register server/src/puppeteer-ssr/pm2.uws.worker.ts',
    ])
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}

runScript()
