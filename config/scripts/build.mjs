import runCommand from '../utils/RunCommand.mjs'

async function runScript() {
  try {
    await runCommand('node', [
      '-r sucrase/register server/src/utils/BeforeBuildHandler.ts',
    ])

    await runCommand('./node_modules/.bin/tsc', ['-b'])

    await runCommand('./node_modules/.bin/eslint', [
      'src/**/*.{t,j}s{,x}',
      '--no-error-on-unmatched-pattern',
      '--quiet',
    ])

    const staging = process.env.DEPLOY_STAGING_DIR
    await runCommand(
      './node_modules/.bin/vite',
      ['build', ...(staging ? ['--outDir', `${staging}/dist`] : [])],
      { shell: false }
    )

    if (!staging)
      await runCommand('node', [
        '-r sucrase/register server/src/utils/AfterBuildHandler.ts',
      ])
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}

runScript()
