import runCommand from '../utils/RunCommand.mjs'

async function runScript() {
  try {
    await runCommand('./node_modules/.bin/tsc', ['--noEmit'])

    await runCommand(
      'prettier',
      [
        'src/**/*.{js,mjs,cjs,ts,jsx,tsx}',
        '--no-error-on-unmatched-pattern',
        ...(process.argv.includes('--write') ? [] : ['--check']),
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
