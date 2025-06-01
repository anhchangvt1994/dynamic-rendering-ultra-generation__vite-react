import runCommand from '../utils/RunCommand.mjs'

async function runScript() {
  try {
    await runCommand('./node_modules/.bin/cross-env', [
      'ENV=development',
      'node -r sucrase/register server/src/index.ts',
    ])
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}

runScript()
