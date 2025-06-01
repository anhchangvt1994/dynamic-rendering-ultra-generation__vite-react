import runCommand from '../utils/RunCommand.mjs'

async function runScript() {
  try {
    await runCommand('npm', ['run build'])
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}

runScript()
