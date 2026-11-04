import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServerEngine } from '../engine/server.ts'
import { createGuestEngine } from '../engine/guest.mjs'
import {
  canRetry,
  parseReceipt,
  shardMessage,
  startShardClaim,
} from './client.ts'

const RECEIPT = {
  roundId: 'r-1',
  speciesId: 25,
  state: 'awarded',
  count: 2,
  required: 7,
  drop: 0.806,
}
const client = (replies) => {
  const calls = []
  return {
    calls,
    rpc: async (name, args) => {
      calls.push([name, args])
      const reply = replies[name]
      return typeof reply === 'function' ? reply(args) : reply
    },
  }
}
const deferred = () => {
  let resolve, reject
  const promise = new Promise((a, b) => ((resolve = a), (reject = b)))
  return { promise, resolve, reject }
}

test('the adapter claims with the round only and returns the receipt', async () => {
  const supabase = client({ quiz_claim_shard: { data: RECEIPT, error: null } })
  const receipt = await createServerEngine(supabase).claimShard('r-1')
  assert.deepEqual(supabase.calls, [['quiz_claim_shard', { p_round: 'r-1' }]])
  assert.deepEqual(receipt, RECEIPT)
})

test('a malformed receipt is rejected, never shown', async () => {
  for (const data of [
    null,
    {},
    { ...RECEIPT, state: 'won' },
    { ...RECEIPT, count: -1 },
    { ...RECEIPT, count: '2' },
    { ...RECEIPT, speciesId: 0 },
    { ...RECEIPT, roundId: 5 },
    { ...RECEIPT, required: 'x' },
  ]) {
    assert.throws(() => parseReceipt(data), /receipt/)
    await assert.rejects(
      createServerEngine(
        client({ quiz_claim_shard: { data, error: null } })
      ).claimShard('r-1'),
      /receipt/
    )
  }
  assert.deepEqual(
    parseReceipt({
      ...RECEIPT,
      state: 'ineligible',
      required: null,
      drop: null,
    }),
    { ...RECEIPT, state: 'ineligible', required: null, drop: null }
  )
})

test('reconcile asks the server for the pending receipts and validates each', async () => {
  const supabase = client({
    quiz_reconcile_shards: { data: [RECEIPT], error: null },
  })
  const engine = createServerEngine(supabase)
  assert.deepEqual(await engine.reconcileShards(), [RECEIPT])
  assert.deepEqual(supabase.calls, [['quiz_reconcile_shards', undefined]])
  await assert.rejects(
    createServerEngine(
      client({ quiz_reconcile_shards: { data: [{}], error: null } })
    ).reconcileShards(),
    /receipt/
  )
  await assert.rejects(
    createServerEngine(
      client({ quiz_reconcile_shards: { data: {}, error: null } })
    ).reconcileShards(),
    /receipt/
  )
})

test('a claim that fails does not throw into the page: the notice can retry', async () => {
  const states = []
  const engine = {
    rewards: true,
    claimShard: async () => {
      throw new Error('network')
    },
  }
  startShardClaim(engine, 'r-1', (state) => states.push(state.kind))
  await new Promise((resolve) => setTimeout(resolve))
  assert.deepEqual(states, ['claiming', 'error'])
})

test('a claim settles into a receipt', async () => {
  const states = []
  const engine = { rewards: true, claimShard: async () => RECEIPT }
  startShardClaim(engine, 'r-1', (state) => states.push(state))
  await new Promise((resolve) => setTimeout(resolve))
  assert.deepEqual(states, [
    { kind: 'claiming' },
    { kind: 'receipt', receipt: RECEIPT },
  ])
})

test('a deferred claim of an engine that went away is dropped', async () => {
  const slow = deferred()
  const states = []
  const cancel = startShardClaim(
    { rewards: true, claimShard: () => slow.promise },
    'r-1',
    (state) => states.push(state.kind)
  )
  cancel()
  slow.resolve(RECEIPT)
  await new Promise((resolve) => setTimeout(resolve))
  assert.deepEqual(states, ['claiming'])
  const failing = deferred()
  const errors = []
  const stop = startShardClaim(
    { rewards: true, claimShard: () => failing.promise },
    'r-1',
    (state) => errors.push(state.kind)
  )
  stop()
  failing.reject(new Error('late'))
  await new Promise((resolve) => setTimeout(resolve))
  assert.deepEqual(errors, ['claiming'])
})

test('a guest sends no claim and shows nothing', async () => {
  const engine = createGuestEngine()
  assert.equal(engine.rewards, false)
  assert.deepEqual(await engine.reconcileShards(), [])
  assert.equal((await engine.claimShard('guest-1')).state, 'ineligible')
  const states = []
  startShardClaim(engine, 'guest-1', (state) => states.push(state))
  await new Promise((resolve) => setTimeout(resolve))
  assert.deepEqual(states, [])
})

test('the notice speaks only of what is awarded or being confirmed', () => {
  assert.equal(
    shardMessage({ kind: 'receipt', receipt: RECEIPT }, 'Pikachu'),
    'Nhận 1 mảnh Pikachu'
  )
  assert.equal(
    shardMessage(
      { kind: 'receipt', receipt: { ...RECEIPT, state: 'pending' } },
      'Pikachu'
    ),
    'Đang xác nhận mảnh'
  )
  assert.equal(
    shardMessage({ kind: 'claiming' }, 'Pikachu'),
    'Đang xác nhận mảnh'
  )
  for (const state of ['not_awarded', 'ineligible'])
    assert.equal(
      shardMessage(
        { kind: 'receipt', receipt: { ...RECEIPT, state } },
        'Pikachu'
      ),
      null
    )
  assert.equal(shardMessage({ kind: 'error' }, 'Pikachu'), null)
})

test('a journal that can never settle ends the notice quietly, no dead-end retry', async () => {
  for (const failure of [
    Object.assign(new Error('x'), { code: 'locks_unavailable' }),
    Object.assign(new Error('x'), { code: 'journal_corrupt' }),
    new Error('no_round'),
  ]) {
    const states = []
    startShardClaim(
      {
        rewards: true,
        claimShard: async () => {
          throw failure
        },
      },
      'r-1',
      (state) => states.push(state.kind)
    )
    await new Promise((resolve) => setTimeout(resolve))
    assert.deepEqual(states, ['claiming', 'unavailable'])
  }
  assert.equal(shardMessage({ kind: 'unavailable' }, 'Pikachu'), null)
})

test('a pending receipt can be asked again', () => {
  assert.equal(
    canRetry({ kind: 'receipt', receipt: { ...RECEIPT, state: 'pending' } }),
    true
  )
  assert.equal(canRetry({ kind: 'error' }), true)
  assert.equal(canRetry({ kind: 'receipt', receipt: RECEIPT }), false)
  assert.equal(canRetry({ kind: 'unavailable' }), false)
})
