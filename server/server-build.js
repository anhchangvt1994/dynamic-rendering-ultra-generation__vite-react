const { spawn } = require('child_process')

// Resolve the project dependency directly; do not depend on a global CLI or PATH.
let sucrase
try {
  sucrase = require.resolve('sucrase/bin/sucrase')
} catch {
  console.error(
    'Sucrase is missing. Run yarn install --production=false in the project root.'
  )
  process.exit(1)
}
const child = spawn(
  process.execPath,
  [
    sucrase,
    '--quiet',
    './server/src',
    '-d',
    './server/dist',
    '--transforms',
    'typescript,imports',
  ],
  {
    stdio: 'inherit',
  }
)

child.on('error', (error) => {
  console.error(`Could not start Sucrase: ${error.message}`)
  process.exit(1)
})
child.on('close', (code) => {
  if (code !== 0) {
    console.error(`Sucrase exited with code ${code}`)
    process.exit(code || 1)
  }
  console.log('Sucrase build completed successfully')
})
