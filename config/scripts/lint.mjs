import runCommand from '../utils/RunCommand.mjs'

async function runScript() {
  try {
    await runCommand('./node_modules/.bin/tsc', ['-b'])

    await runCommand('./node_modules/.bin/eslint', [
      'src/**/*.{t,j}s{,x}',
      '--no-error-on-unmatched-pattern',
      '--no-warn-ignored',
    ])
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}

runScript()
