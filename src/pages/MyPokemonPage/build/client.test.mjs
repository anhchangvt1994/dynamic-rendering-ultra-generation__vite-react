import assert from 'node:assert/strict'
import test from 'node:test'
import { fetchBuild, setMove, useItem } from './client.mjs'

const fake = (result) => {
  const calls = []
  return {
    calls,
    rpc: async (name, args) => {
      calls.push([name, args])
      return result
    },
  }
}

test('mutations send the operation id and the choice only', async () => {
  const supabase = fake({ data: { level: 5 }, error: null })
  const deps = { mode: 'server', supabase }
  await setMove(deps, 'op1', 'i1', 2, 'tackle')
  await useItem(deps, 'op2', 'i1', 'bottle-cap', 1)
  assert.deepEqual(supabase.calls, [
    [
      'pokemon_set_move',
      { p_operation: 'op1', p_individual: 'i1', p_slot: 2, p_move: 'tackle' },
    ],
    [
      'pokemon_use_item',
      {
        p_operation: 'op2',
        p_individual: 'i1',
        p_item: 'bottle-cap',
        p_stat: 1,
      },
    ],
  ])
})

test('server errors map to Vietnamese codes; guests are refused', async () => {
  const deps = {
    mode: 'server',
    supabase: fake({ data: null, error: { message: 'item_limit' } }),
  }
  await assert.rejects(useItem(deps, 'o', 'i', 'rare-candy'), {
    code: 'item_limit',
    message: 'Đã dùng đủ 3 vật phẩm',
  })
  await assert.rejects(fetchBuild({ mode: 'guest' }, 'i'), {
    code: 'build_unavailable',
  })
  const net = {
    mode: 'server',
    supabase: fake({ data: null, error: { message: 'fetch failed' } }),
  }
  await assert.rejects(fetchBuild(net, 'i'), { code: 'network' })
})
