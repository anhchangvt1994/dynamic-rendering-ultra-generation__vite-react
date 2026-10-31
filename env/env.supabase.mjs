import { supabaseClientEnv } from '../config/utils/Supabase.mjs'

// NOTE - Public values only (URL + publishable key), see config/utils/Supabase.mjs
export default {
  prefix: 'supabase_client',
  data: supabaseClientEnv(),
}
