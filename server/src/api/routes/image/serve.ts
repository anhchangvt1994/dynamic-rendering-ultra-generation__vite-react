import fs from 'fs'
import path from 'path'
import { getPokemonArtPath } from '../../../utils/PathHandler'
import { rigFileType } from './rigFiles'

/**
 * GET /api/image/<key>.webp and /api/image/rig/<key>/<file> (express, fastify
 * and uWebSockets adapters beside this file). The server builds nothing: the
 * files come from getPokemonArtPath() (utils/PathHandler), made on a dev
 * machine by `yarn build:pokemon-art` (tools/image-build) and uploaded.
 *   <dir>/<key>/anim.webp                           the upscaled animation
 *   <dir>/<key>/{rig.json,sheet-N.webp,flow.webp,flow-lo.webp,eye.png}   the room's rig
 * A file that is not there is a 404 (the client falls back to the original).
 */
export const KEY = /^[a-z0-9-]{1,40}$/
export const CACHED = 'public, max-age=86400, stale-while-revalidate=604800'

const ART_DIR = getPokemonArtPath()

/** "/api/image/25.webp" → "25"; null if malformed */
export const readKey = (url: string) => {
  const key = url.match(/^\/api\/image\/([a-z0-9-]+)\.webp$/)?.[1]
  return key && KEY.test(key) ? key : null
}

/** "/api/image/rig/25/flow.webp" → { key: "25", file: "flow.webp" }; null if malformed */
export const readRigUrl = (url: string) => {
  const m = url.match(/^\/api\/image\/rig\/([^/]+)\/([^/?]+)$/)
  return m && KEY.test(m[1]) && rigFileType(m[2])
    ? { key: m[1], file: m[2] }
    : null
}

const reply = (status: number, type: string, body: Buffer) => ({
  status,
  type,
  body,
  cache: status === 200 ? CACHED : 'no-cache',
})
const none = () => reply(404, 'text/plain', Buffer.from('Not found'))

const read = (key: string, file: string) =>
  fs.promises.readFile(path.join(ART_DIR, key, file)).catch(() => null)

export const serveImage = async (url: string) => {
  const key = readKey(url)
  const body = key && (await read(key, 'anim.webp'))
  return body ? reply(200, 'image/webp', body) : none()
}

export const serveRig = async (url: string) => {
  const parsed = readRigUrl(url)
  const body = parsed && (await read(parsed.key, parsed.file))
  return body && parsed ? reply(200, rigFileType(parsed.file)!, body) : none()
}
