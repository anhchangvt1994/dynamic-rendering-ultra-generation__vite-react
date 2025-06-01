import runCommand from '../utils/RunCommand.mjs'

async function runScript() {
  try {
    await runCommand('node', ['server/server-build.js'])
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}

runScript()
