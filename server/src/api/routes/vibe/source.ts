import { PROCESS_ENV } from '../../../utils/InitEnv'
import { hashCode } from '../../../utils/StringHelper'
import { compressData, getData, setData } from '../../utils/CacheManager'
import { getDataCompression } from '../../utils/CacheManager/utils'
import { fetchData } from '../../utils/FetchManager'
import { supabaseService } from '../supabase/config'
import type { VibeDeps } from './service'
import { storeVibe } from './store'

// the cache may hold JSON text stored as a JSON string: parse until an object
const parse = (value: unknown) => {
  let v = value
  for (let i = 0; i < 2 && typeof v === 'string'; i++) v = JSON.parse(v)
  return v && typeof v === 'object' ? v : null
}

/**
 * A PokéAPI endpoint through the proxy cache the client uses (key
 * hashCode(endpoint)); a miss is fetched and stored the same way.
 */
const load: VibeDeps['load'] = async (endpoint) => {
  const key = hashCode(endpoint)
  const meta = await getData(key)
  if (meta?.cache?.status === 200) {
    const buffer = await getDataCompression(key, '')
    if (buffer) {
      try {
        const json = parse(buffer.toString('utf8'))
        if (json) return json
      } catch {
        // fall through to a fresh fetch
      }
    }
  }
  const base = String(PROCESS_ENV.POKEAPI_BASE_URL || '').replace(/\/+$/, '')
  if (!base) return null
  const url = `${base}${endpoint}`
  const { data, ...result } = await fetchData(url, { method: 'GET' })
  if (result.status !== 200) return null
  const json = parse(data)
  if (!json) return null
  // stored like api/index.ts does for a client request with expiredTime
  // 'infinite' (the cache types say number; the proxy also accepts it)
  const content: any = {
    url,
    method: 'GET',
    cache: { expiredTime: 'infinite', ...result },
  }
  setData(key, content, { isCompress: false })
  compressData(key, data)
  return json
}

/** Stores the vibe with the service role (Supabase only). */
const save: VibeDeps['save'] = async (row) => {
  if (!PROCESS_ENV.ENABLE_SUPABASE) return
  await storeVibe(fetch, supabaseService(), row)
}

// once per species and rule version for this process; a failed store is
// tried again on the next request
export const vibeDeps: VibeDeps = {
  load,
  save,
  stored: new Set(),
  warn: (error) => console.warn('[vibe] store failed:', error),
}
