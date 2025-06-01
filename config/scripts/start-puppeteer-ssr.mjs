import runCommand from '../utils/RunCommand.mjs'

async function runScript() {
  try {
    await runCommand('./node_modules/.bin/pm2', [
      '-i 1 --silent start npm --name',
      '\"start-puppeteer-ssr\" -- run pm2-puppeteer-ssr',
    ])
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}

runScript()
