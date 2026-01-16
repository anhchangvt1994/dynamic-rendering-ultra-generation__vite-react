async function runScript() {
  try {
    await runCommand('node', [
      '-r sucrase/register server/src/puppeteer-ssr/pm2.uws.ts',
    ])
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}

export default runScript
