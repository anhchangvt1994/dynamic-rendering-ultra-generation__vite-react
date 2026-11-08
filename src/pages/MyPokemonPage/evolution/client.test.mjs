import assert from 'node:assert/strict'
import test from 'node:test'
import { EVOLUTION_ERRORS, fetchEvolutionOptions, sendEvolve } from './client.mjs'

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

test('options and evolve send the documented rpc arguments only', async () => {
  const supabase = fake({ data: { branches: [] }, error: null })
  const deps = { mode: 'server', supabase }
  await fetchEvolutionOptions(deps, 'i1')
  await fetchEvolutionOptions(deps, 'i1', { where: 'x' })
  await sendEvolve(deps, 'op1', 'i1', 134, { item: 'water-stone' })
  await sendEvolve(deps, 'op2', 'i1', 5, { context: { party: [1] } })
  assert.deepEqual(supabase.calls, [
    ['pokemon_evolution_options', { p_individual: 'i1', p_context: {} }],
    ['pokemon_evolution_options', { p_individual: 'i1', p_context: { where: 'x' } }],
    [
      'pokemon_evolve',
      { p_operation: 'op1', p_individual: 'i1', p_branch: 134, p_context: {}, p_item: 'water-stone' },
    ],
    [
      'pokemon_evolve',
      { p_operation: 'op2', p_individual: 'i1', p_branch: 5, p_context: { party: [1] }, p_item: null },
    ],
  ])
})

test('server errors map to a Vietnamese message and a code', async () => {
  for (const code of ['not_eligible', 'no_item', 'invalid_branch', 'operation_conflict', 'not_found']) {
    const deps = { mode: 'server', supabase: fake({ data: null, error: { message: code } }) }
    await assert.rejects(sendEvolve(deps, 'o', 'i', 5), { code, message: EVOLUTION_ERRORS[code] })
  }
  const net = { mode: 'server', supabase: fake({ data: null, error: { message: 'fetch failed' } }) }
  await assert.rejects(fetchEvolutionOptions(net, 'i'), { code: 'network', message: EVOLUTION_ERRORS.network })
})

test('guests and local mode are refused with evolution_unavailable', async () => {
  await assert.rejects(fetchEvolutionOptions({ mode: 'guest' }, 'i'), { code: 'evolution_unavailable' })
  await assert.rejects(sendEvolve({ mode: 'local', supabase: {} }, 'o', 'i', 5), {
    code: 'evolution_unavailable',
  })
})
