// yarn watch:pokemon-art — keeps running (pm2 start config/scripts/watch-pokemon-art.mjs
// --name pokemon-art-watch): when a species lands in the inbox (the folder
// yarn upload:pokemon-art fills), it is moved to the folder the server reads.
// The server reads the disk per request: no build, no reload.
import { fileURLToPath } from 'node:url'
import { adoptPokemonArt, pokemonArtFolder } from '../utils/AutoDeploy.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const every = Number(process.env.POKEMON_ART_WATCH_MS) || 15000
const log = (message) => console.log(`[pokemon-art-watch] ${message}`)

const tick = () => {
  try {
    adoptPokemonArt(root, log, process.env, pokemonArtFolder(root), {
      quietMs: 20000,
    })
  } catch (error) {
    log(`failed: ${error.message}`)
  }
}
log(`watching every ${every / 1000}s`)
tick()
setInterval(tick, every)
