import { loadEnv } from '../utils/ServerEnv.mjs'
import { checkSelfHostedSupabase } from '../utils/Supabase.mjs'

// NOTE - yarn supabase:check: what the self-hosted stack still misses (public
// URL, mail DNS), without starting anything
try {
  await checkSelfHostedSupabase(loadEnv('production'))
} catch (err) {
  console.error(`[supabase] ${err.message}`)
  process.exitCode = 1
}
