import assert from 'node:assert/strict'
import test from 'node:test'
import { initialCare } from './care.mjs'
import { CARE_ERRORS, readCare, sendCare } from './client.mjs'

const ONE = { id: 'c1', createdAt: '2026-11-05T00:00:00.000Z' }
const ROW = {
  individual_id: 'c1',
  user_id: 'u1',
  hunger: '90.00',
  clean: 60,
  fun: '45.5',
  needs_at: '2026-11-05T05:00:00+00:00',
  affection: 3,
  power: 4,
  beauty: 0,
  happiness: 0,
  agility: 0,
  wisdom: 0,
  friendship: 3,
  last_cared_at: '2026-11-05T05:00:00+00:00',
  mood_event: null,
  mood_event_at: null,
  pet_window_start: null,
  pet_window_count: 0,
  bathed_at: null,
}

function fakeSupabase({ row = null, error = null, rpc = {} } = {}) {
  const calls = []
  return {
    calls,
    from: (table) => ({
      select: () => ({
        eq: (column, value) => ({
          maybeSingle: async () => {
            calls.push({ table, column, value })
            return { data: row, error }
          },
        }),
      }),
    }),
    rpc: async (name, args) => {
      calls.push({ rpc: name, args })
      return rpc
    },
  }
}

test('readCare turns the row into CareState with numeric needs', async () => {
  const supabase = fakeSupabase({ row: ROW })
  const care = await readCare({ mode: 'server', supabase }, ONE)
  assert.deepEqual(care.needs, { hunger: 90, clean: 60, fun: 45.5 })
  assert.equal(care.needsAt, '2026-11-05T05:00:00+00:00')
  assert.deepEqual(care.stats, {
    power: 4,
    beauty: 0,
    happiness: 0,
    agility: 0,
    wisdom: 0,
    friendship: 3,
  })
  assert.equal(care.lastCaredAt, '2026-11-05T05:00:00+00:00')
  assert.equal(care.petWindowCount, 0)
  assert.deepEqual(supabase.calls[0], {
    table: 'pokemon_care',
    column: 'individual_id',
    value: 'c1',
  })
})

test('readCare: no row is the initial care', async () => {
  const care = await readCare({ mode: 'server', supabase: fakeSupabase() }, ONE)
  assert.deepEqual(care, initialCare(ONE.createdAt))
})

test('readCare: a failed select throws, never a default', async () => {
  await assert.rejects(
    readCare(
      {
        mode: 'server',
        supabase: fakeSupabase({ error: { message: 'boom' } }),
      },
      ONE
    ),
    /boom/
  )
})

test('sendCare calls the RPC and returns its receipt', async () => {
  const receipt = { operationId: 'op', action: 'feed', care: { needs: {} } }
  const supabase = fakeSupabase({ rpc: { data: receipt, error: null } })
  assert.deepEqual(
    await sendCare(
      { mode: 'server', supabase },
      'op',
      'feed',
      ONE,
      'poffin-cheri'
    ),
    receipt
  )
  assert.deepEqual(supabase.calls[0], {
    rpc: 'care_feed',
    args: { p_operation: 'op', p_individual: 'c1', p_dish: 'poffin-cheri' },
  })
  await sendCare({ mode: 'server', supabase }, 'op2', 'pet', ONE)
  assert.deepEqual(supabase.calls[1], {
    rpc: 'care_pet',
    args: { p_operation: 'op2', p_individual: 'c1' },
  })
})

test('sendCare: a known error keeps its code', async () => {
  const supabase = fakeSupabase({
    rpc: { data: null, error: { message: 'full' } },
  })
  await assert.rejects(
    sendCare({ mode: 'server', supabase }, 'op', 'feed', ONE, 'x'),
    {
      code: 'full',
      message: CARE_ERRORS.full,
    }
  )
})

test('sendCare: an unknown error is the network one', async () => {
  const supabase = fakeSupabase({
    rpc: { data: null, error: { message: 'Failed to fetch' } },
  })
  await assert.rejects(
    sendCare({ mode: 'server', supabase }, 'op', 'pet', ONE),
    {
      code: 'network',
      message: CARE_ERRORS.network,
    }
  )
})

test('the error copy', () => {
  assert.equal(CARE_ERRORS.full, 'Đang no')
  assert.equal(CARE_ERRORS.no_dish, 'Hết món, hãy nấu')
  assert.equal(CARE_ERRORS.bathe_cooldown, 'Vừa tắm xong')
  assert.equal(CARE_ERRORS.not_found, 'Không tìm thấy Pokémon này')
  assert.equal(CARE_ERRORS.network, 'Mất kết nối, thử lại nhé')
})

test('a guest cannot care', async () => {
  await assert.rejects(readCare({ mode: 'guest' }, ONE), {
    code: 'care_unavailable',
  })
  await assert.rejects(sendCare({ mode: 'guest' }, 'op', 'pet', ONE), {
    code: 'care_unavailable',
  })
})

test('local mode goes through the journal', async () => {
  const journal = {
    read: async (id) => (id === 'c1' ? null : 'x'),
    act: async (...args) => ({ args }),
  }
  assert.deepEqual(
    await readCare({ mode: 'local', journal }, ONE),
    initialCare(ONE.createdAt)
  )
  assert.deepEqual(
    (await sendCare({ mode: 'local', journal }, 'op', 'feed', ONE, 'd')).args,
    ['op', 'feed', 'c1', 'd']
  )
})
