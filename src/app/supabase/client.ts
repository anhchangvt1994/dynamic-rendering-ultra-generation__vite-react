import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Accounts are on: ENABLE_SUPABASE (server/.env), see config/utils/Supabase.mjs.
 * Off, this is the constant false and every account branch is left out of
 * the bundle.
 */
export const ACCOUNTS_ENABLED = import.meta.env.SUPABASE_CLIENT_ENABLED === true

// the session, in localStorage: its presence alone says "load the client"
const STORAGE_KEY = 'pokedex:auth'

// NOTE - yarn dev opened from a phone on the LAN: the local stack's
// 127.0.0.1 is the computer serving this page, not the phone
const apiUrl = () => {
  const url = new URL(import.meta.env.SUPABASE_CLIENT_URL)
  if (import.meta.env.DEV && ['127.0.0.1', 'localhost'].includes(url.hostname))
    url.hostname = location.hostname
  return url.href.replace(/\/+$/, '')
}

let client: Promise<SupabaseClient> | undefined

/**
 * The Supabase client, loaded on first use (its code is not on the page
 * until someone signs in, or comes back signed in). It talks to the
 * Supabase URL directly, never through the /api cache proxy.
 */
export function getSupabase() {
  client ??= import('@supabase/supabase-js').then(
    ({ createClient }) =>
      createClient(apiUrl(), import.meta.env.SUPABASE_CLIENT_PUBLISHABLE_KEY, {
        auth: {
          storageKey: STORAGE_KEY,
          persistSession: true,
          autoRefreshToken: true,
          // sign-in is by code typed on the page: no tokens in URLs
          detectSessionInUrl: false,
        },
      }),
    (err) => {
      client = undefined // offline, new deploy: try again next time
      throw err
    }
  )
  return client
}

export function hasStoredSession() {
  try {
    return Boolean(localStorage.getItem(STORAGE_KEY))
  } catch {
    return false
  }
}
