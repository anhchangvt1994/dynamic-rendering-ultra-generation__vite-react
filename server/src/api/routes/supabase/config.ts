import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { PROCESS_ENV } from '../../../utils/InitEnv'

// NOTE - The service role key never reaches the browser. yarn dev passes the
// local stack's (config/scripts/dev.mjs); the self-hosted stack keeps it in
// infra/supabase/.env. SUPABASE_INTERNAL_URL: the API as this server reaches
// it (defaults to SUPABASE_PUBLIC_URL)
const serviceRoleKey = (() => {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY)
    return process.env.SUPABASE_SERVICE_ROLE_KEY
  const stackSecrets = path.resolve(
    __dirname,
    '../../../../../infra/supabase/.env'
  )
  if (!fs.existsSync(stackSecrets)) return ''
  return dotenv.parse(fs.readFileSync(stackSecrets)).SERVICE_ROLE_KEY || ''
})()

/** Where this server reaches Supabase, and its service role key. */
export const supabaseService = () => ({
  url: String(
    process.env.SUPABASE_INTERNAL_URL || PROCESS_ENV.SUPABASE_PUBLIC_URL || ''
  ).replace(/\/+$/, ''),
  key: serviceRoleKey,
})
