const fs = require('fs-extra')
const { spawn } = require('child_process')

const serverDistPath = './server/dist'

if (fs.existsSync(serverDistPath)) {
  try {
    fs.emptyDirSync(serverDistPath)
  } catch (err) {
    console.error(err)
  }
}

const child = spawn(
  'sucrase',
  ['--quiet ./server/src -d ./server/dist --transforms typescript,imports'],
  {
    stdio: 'inherit',
    shell: true,
  }
)

child.on('close', (code) => {
  if (code !== 0) {
    console.error(`Sucrase exited with code ${code}`)
    process.exit(code)
  }
  console.log('Sucrase build completed successfully')
})
