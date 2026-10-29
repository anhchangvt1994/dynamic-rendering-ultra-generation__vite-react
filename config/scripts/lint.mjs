import runCommand from '../utils/RunCommand.mjs'

async function runScript() {
  try {
    await runCommand('./node_modules/.bin/tsc', ['-b'])

    await runCommand(
      './node_modules/.bin/eslint',
      [
        'src/**/*.{js,mjs,cjs,ts,jsx,tsx}',
        'server/src/**/*.{js,mjs,cjs,ts,jsx,tsx}',
        '--no-error-on-unmatched-pattern',
        '--no-warn-ignored',
        ...process.argv.slice(2),
      ],
      { shell: false }
    )
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}

runScript()
