import { PROCESS_ENV } from '../../../utils/InitEnv'
import { hashCode } from '../../../utils/StringHelper'
import { compressData, getData, setData } from '../../utils/CacheManager'
import { getDataCompression } from '../../utils/CacheManager/utils'
import { fetchData } from '../../utils/FetchManager'
import { quizMediaConfig } from '../quiz/config'
import type { VibeDeps } from './service'

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

/** Upserts pokemon_species_vibes with the service role (Supabase only). */
const save: VibeDeps['save'] = async (row) => {
  if (!PROCESS_ENV.ENABLE_SUPABASE) return
  const { url, key } = quizMediaConfig()
  if (!url || !key) return
  await fetch(`${url}/rest/v1/pokemon_species_vibes?on_conflict=species_id`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({ ...row, updated_at: new Date().toISOString() }),
    signal: AbortSignal.timeout(5000),
  })
}

export const vibeDeps: VibeDeps = { load, save }
