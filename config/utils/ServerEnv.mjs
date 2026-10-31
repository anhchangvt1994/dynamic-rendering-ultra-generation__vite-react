/**
 * NOTE - The server env (server/.env + server/.env.<mode>), resolved the same
 * way as server/src/utils/InitEnv.ts, for the scripts that run before the
 * server: preflight, yarn dev, the frontend env (env/*.mjs).
 */
import dotenv from 'dotenv'
import fs from 'fs'
import { fileURLToPath } from 'url'

const SERVER_DIR = fileURLToPath(new URL('../../server/', import.meta.url))

/** "true" / "1" (any case) */
export const isEnabled = (value) =>
  ['true', '1'].includes(String(value).toLowerCase())

export const loadEnv = (env) => {
  const mode = ['development', 'preview', 'production'].includes(
    process.env.MODE
  )
    ? process.env.MODE
    : env === 'development'
      ? 'development'
      : 'production'
  const envMode = {
    development_development: 'development',
    development_preview: 'staging',
    development_production: 'production',
    production_development: 'staging',
    production_preview: 'uat',
    production_production: 'production',
  }[`${env}_${mode}`]

  const result = { ...process.env }
  const serverEnv = (file) => {
    const filePath = `${SERVER_DIR}${file}`
    return fs.existsSync(filePath)
      ? dotenv.parse(fs.readFileSync(filePath))
      : {}
  }

  // NOTE - server/.env does not override process.env, server/.env.<mode> does
  for (const [key, value] of Object.entries(serverEnv('.env')))
    if (result[key] === undefined) result[key] = value

  if (envMode !== 'development')
    Object.assign(result, serverEnv(`.env.${envMode}`))

  // Private per-machine overrides (SMTP API keys, deployment credentials).
  // This file is gitignored and deliberately wins over tracked mode files.
  Object.assign(result, serverEnv('.env.local'))

  return result
} // loadEnv
