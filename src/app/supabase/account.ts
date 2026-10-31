import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { useSyncExternalStore } from 'react'
import { replaceCaught } from 'utils/caught.mjs'
import { startCaughtSync } from './caughtSync'
import { ACCOUNTS_ENABLED, getSupabase, hasStoredSession } from './client'

export type AccountState = {
  /** off: ENABLE_SUPABASE is false; checking: a stored session is loading */
  status: 'off' | 'checking' | 'signed-out' | 'signed-in'
  user: User | null
}

let state: AccountState = {
  status: ACCOUNTS_ENABLED ? 'checking' : 'off',
  user: null,
}
const listeners = new Set<() => void>()
const setState = (next: AccountState) => {
  state = next
  listeners.forEach((listener) => listener())
}

let stopSync: (() => void) | undefined
let syncFor = ''

const apply = (event: AuthChangeEvent, session: Session | null) => {
  const user = session?.user ?? null
  if (user && user.id === state.user?.id) {
    setState({ status: 'signed-in', user }) // a refreshed token, new email
    return
  }
  stopSync?.()
  stopSync = undefined
  syncFor = user?.id ?? ''
  if (!user) {
    setState({ status: 'signed-out', user: null })
    return
  }
  setState({ status: 'signed-in', user })
  getSupabase()
    .then((supabase) => startCaughtSync(supabase, event === 'SIGNED_IN'))
    .then((stop) => {
      // signed out (or in as someone else) while it was starting
      if (syncFor === user.id) stopSync = stop
      else stop()
    })
    .catch(() => {
      // the collection stays local until the next visit
    })
}

let connection: ReturnType<typeof getSupabase> | undefined

/** Load the client and follow its session (sign-in page, stored session). */
export function connectAccount() {
  connection ??= getSupabase().then(
    (supabase) => {
      supabase.auth.onAuthStateChange((event, session) => {
        // NOTE - Never await inside this callback (supabase-js holds a lock
        // while it runs): the work goes after it
        setTimeout(() => apply(event, session), 0)
      })
      return supabase
    },
    (err) => {
      connection = undefined
      throw err
    }
  )
  return connection
}

let started = false
const start = () => {
  if (started || !ACCOUNTS_ENABLED) return
  started = true
  // crawlers and ISR snapshots never sign in; nobody to restore: no client
  if (BotInfo.isBot || RenderingInfo.loader || !hasStoredSession()) {
    setState({ status: 'signed-out', user: null })
    return
  }
  connectAccount().catch(() => setState({ status: 'signed-out', user: null }))
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  start()
  return () => {
    listeners.delete(listener)
  }
}
const snapshot = () => state

export function useAccount() {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}

/**
 * Sign out of this device. The collection on it belonged to the account, so
 * it is cleared: the next person here starts their own.
 */
export async function signOut() {
  const supabase = await connectAccount()
  stopSync?.()
  stopSync = undefined
  syncFor = ''
  await supabase.auth.signOut({ scope: 'local' })
  replaceCaught([])
}
