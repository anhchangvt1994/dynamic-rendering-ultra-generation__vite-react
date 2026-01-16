import runCommand from '../utils/RunCommand.mjs'

async function runScript() {
  try {
    await runCommand('node', ['server/server-build.js'])
    await runCommand('git', ['add ./server/dist'])
    await runCommand('./node_modules/.bin/tsc')
    await runCommand('lint-staged', ['--allow-empty'])
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}

runScript()
