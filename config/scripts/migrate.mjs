import { loadEnv } from '../utils/ServerEnv.mjs'
import {
  migrateLocalSupabase,
  migrateSelfHostedSupabase,
} from '../utils/Supabase.mjs'

// NOTE - yarn migrate: supabase/migrations + supabase/seed/*.sql on the
// self-hosted stack (VPS); yarn migrate --local for the yarn dev stack
try {
  if (process.argv.includes('--local')) await migrateLocalSupabase()
  else await migrateSelfHostedSupabase(loadEnv('production'))
} catch (err) {
  console.error(`[supabase] ${err.message}`)
  process.exitCode = 1
}
