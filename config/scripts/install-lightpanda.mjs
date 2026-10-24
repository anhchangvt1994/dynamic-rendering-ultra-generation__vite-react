import { installLightpanda } from '../utils/LightpandaInstaller.mjs'

installLightpanda().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
