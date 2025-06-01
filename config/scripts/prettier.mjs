import runCommand from '../utils/RunCommand.mjs'

async function runScript() {
  try {
    await runCommand('./node_modules/.bin/tsc', ['--noEmit'])

    await runCommand('prettier', [
      'src/**/*.{t,j}s{,x}',
      '--no-error-on-unmatched-pattern',
      '--check',
    ])
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}

runScript()
