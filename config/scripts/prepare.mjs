import runCommand from '../utils/RunCommand.mjs'

async function runScript() {
  try {
    await runCommand('git', ['config core.autocrlf false'])
    await runCommand('npx', ['husky'])
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}

runScript()
