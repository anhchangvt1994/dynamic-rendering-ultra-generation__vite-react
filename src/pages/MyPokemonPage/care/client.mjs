// Where the room's care lives: the account (pokemon_care, care_* RPCs) or
// this browser's journal (yarn dev). A guest has none.
import { initialCare } from './care.mjs'

export const CARE_KEY = 'pokedex:pokemon-care-v1'

export const CARE_ERRORS = {
  full: 'Đang no',
  no_dish: 'Hết món, hãy nấu',
  bathe_cooldown: 'Vừa tắm xong',
  not_found: 'Không tìm thấy Pokémon này',
  operation_conflict: 'Thao tác bị trùng, thử lại nhé',
  care_unavailable: 'Đăng nhập để chăm sóc Pokémon',
  network: 'Mất kết nối, thử lại nhé',
}

const fail = (code) =>
  Object.assign(new Error(CARE_ERRORS[code] ?? CARE_ERRORS.network), {
    code: code in CARE_ERRORS ? code : 'network',
  })

const num = (value) => Number(value)

const fromRow = (row) => ({
  needs: { hunger: num(row.hunger), clean: num(row.clean), fun: num(row.fun) },
  needsAt: row.needs_at,
  affection: row.affection,
  stats: {
    power: row.power,
    beauty: row.beauty,
    happiness: row.happiness,
    agility: row.agility,
    wisdom: row.wisdom,
    friendship: row.friendship,
  },
  lastCaredAt: row.last_cared_at,
  moodEvent: row.mood_event,
  moodEventAt: row.mood_event_at,
  petWindowStart: row.pet_window_start,
  petWindowCount: row.pet_window_count,
  bathedAt: row.bathed_at,
})

const withNumbers = (care) => ({
  ...care,
  needs: Object.fromEntries(
    Object.entries(care.needs ?? {}).map(([k, v]) => [k, num(v)])
  ),
})

/** The care of one individual now stored; none yet is the initial care. */
export async function readCare({ mode, supabase, journal }, individual) {
  if (mode === 'local')
    return (
      (await journal.read(individual.id)) ?? initialCare(individual.createdAt)
    )
  if (mode !== 'server') throw fail('care_unavailable')
  const { data, error } = await supabase
    .from('pokemon_care')
    .select('*')
    .eq('individual_id', individual.id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? fromRow(data) : initialCare(individual.createdAt)
}

/** One action, idempotent by operationId; the receipt carries the new care. */
export async function sendCare(
  { mode, supabase, journal },
  operationId,
  action,
  individual,
  dishId
) {
  if (mode === 'local') {
    try {
      return await journal.act(operationId, action, individual.id, dishId)
    } catch (error) {
      throw fail(error?.code)
    }
  }
  if (mode !== 'server') throw fail('care_unavailable')
  const args = { p_operation: operationId, p_individual: individual.id }
  if (action === 'feed') args.p_dish = dishId
  const { data, error } = await supabase.rpc(`care_${action}`, args)
  if (error) throw fail(error.message)
  return { ...data, care: withNumbers(data.care) }
}

// NOTE - the journal reads recipes.mjs (the secret recipes): dev only, so a
// production build leaves it out
export const localJournal = () =>
  import.meta.env?.DEV
    ? import('./journal.mjs').then(({ createCareJournal }) =>
        createCareJournal()
      )
    : Promise.resolve(null)
