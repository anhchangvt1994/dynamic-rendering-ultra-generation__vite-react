import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { PROCESS_ENV } from '../../../utils/InitEnv'
import type { QuizMediaConfig } from './art'

// NOTE - The service role key reads a round's answer and never reaches the
// browser. yarn dev passes the local stack's (config/scripts/dev.mjs); the
// self-hosted stack keeps it in infra/supabase/.env. SUPABASE_INTERNAL_URL:
// the API as this server reaches it (defaults to SUPABASE_PUBLIC_URL)
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

/** The quiz media proxy's settings. */
export const quizMediaConfig = (): QuizMediaConfig => ({
  url: String(
    process.env.SUPABASE_INTERNAL_URL || PROCESS_ENV.SUPABASE_PUBLIC_URL || ''
  ).replace(/\/+$/, ''),
  key: serviceRoleKey,
  sprites: String(PROCESS_ENV.POKEAPI_SPRITES_BASE_URL || ''),
})

export const QUIZ_MEDIA_ROUTES = [
  '/api/quiz-art/:round',
  '/api/quiz-cry/:round',
]
