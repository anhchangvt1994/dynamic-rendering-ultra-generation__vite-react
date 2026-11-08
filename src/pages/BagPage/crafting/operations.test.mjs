import assert from 'node:assert/strict'
import { test } from 'node:test'
import { craftCard, createCraftController, pendingKey } from './operations.mjs'

const OP1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const OP2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const OP3 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const receipt = (operationId, speciesId = 150, extra = {}) => ({
  operationId,
  speciesId,
  spent: 19,
  shardCount: 2,
  cardCount: 1,
  ...extra,
})
const memory = () => {
  const data = new Map()
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
  }
}
const ids = (...list) => {
  const queue = [...list]
  return () => queue.shift()
}
const deferred = () => {
  let resolve, reject
  const promise = new Promise((a, b) => {
    resolve = a
    reject = b
  })
  return { promise, resolve, reject }
}
const make = (o = {}) => {
  const events = []
  const calls = []
  const controller = createCraftController({
    ownerKey: o.ownerKey ?? 'local',
    storage: o.storage ?? memory(),
    newId: o.newId ?? ids(OP1, OP2, OP3),
    submit:
      o.submit ??
      (async (op, species) => {
        calls.push([op, species])
        return receipt(op, species)
      }),
    refresh: o.refresh ?? (async () => events.push('refresh')),
    onState: (species, state) => events.push([species, state.kind, state]),
  })
  return { controller, events, calls }
}
const last = (events) => events.filter(Array.isArray).at(-1)
const kinds = (events, species = 150) =>
  events.filter((e) => e[0] === species).map((e) => e[1])

test('fresh craft success is tagged user while recovered craft success is tagged resume', async () => {
  const storage = memory()
  const fresh = make({ storage })
  await fresh.controller.craft(150)
  assert.equal(last(fresh.events)[2].origin, 'user')

  const pending = memory()
  pending.setItem(pendingKey('local'), JSON.stringify({ 150: OP1 }))
  const recovered = make({ storage: pending })
  await recovered.controller.resume()
  assert.equal(last(recovered.events)[2].origin, 'resume')
})

test('success: persists the id first, submits it, clears it, refreshes, and reports the receipt', async () => {
  const storage = memory()
  const seen = []
  const { controller, events } = make({
    storage,
    submit: async (op, species) => {
      seen.push(JSON.parse(storage.getItem(pendingKey('local'))))
      return receipt(op, species)
    },
  })
  await controller.craft(150)
  assert.deepEqual(seen, [{ 150: OP1 }])
  assert.deepEqual(JSON.parse(storage.getItem(pendingKey('local'))), {})
  assert.deepEqual(kinds(events), ['submitting', 'success'])
  assert.ok(events.includes('refresh'))
  assert.deepEqual(last(events)[2].receipt, receipt(OP1))
})

test('timeout after a committed submit keeps the id; a restored controller replays the same id', async () => {
  const storage = memory()
  const first = make({
    storage,
    submit: async () => {
      throw new Error('network timeout')
    },
  })
  await first.controller.craft(150)
  const state = last(first.events)[2]
  assert.deepEqual([state.kind, state.retryable], ['uncertain', true])
  first.controller.dispose()
  const second = make({ storage, newId: ids(OP2) })
  await second.controller.resume()
  assert.deepEqual(second.calls, [[OP1, 150]])
  assert.deepEqual(kinds(second.events), ['uncertain', 'submitting', 'success'])
})

test('duplicate clicks share one request and one id', async () => {
  const gate = deferred()
  let submits = 0
  const { controller } = make({
    submit: async (op, species) => {
      submits++
      await gate.promise
      return receipt(op, species)
    },
  })
  const a = controller.craft(150)
  const b = controller.craft(150)
  gate.resolve()
  await Promise.all([a, b])
  assert.equal(submits, 1)
})

test('an uncertain species never gets a new id; retry reuses it, other species are independent', async () => {
  let fail = true
  const { controller, calls } = make({
    submit: async (op, species) => {
      calls.push([op, species])
      if (fail && species === 150) throw new Error('offline')
      return receipt(op, species)
    },
  })
  await controller.craft(150)
  await controller.craft(25)
  await controller.craft(150)
  fail = false
  await controller.retry(150)
  assert.deepEqual(
    calls.map(([op, species]) => [op, species]),
    [
      [OP1, 150],
      [OP2, 25],
      [OP1, 150],
      [OP1, 150],
    ]
  )
})

test('verified business failures clear the id, refresh, and are not retryable', async () => {
  const storage = memory()
  const { controller, events } = make({
    storage,
    submit: async () => {
      throw Object.assign(new Error('insufficient_shards'), {
        code: 'insufficient_shards',
      })
    },
  })
  await controller.craft(150)
  const last = events.filter((e) => e[1] === 'error').at(-1)[2]
  assert.deepEqual([last.retryable, last.code], [false, 'insufficient_shards'])
  assert.deepEqual(JSON.parse(storage.getItem(pendingKey('local'))), {})
  assert.ok(events.includes('refresh'))
})

test('a database message that is a business code is terminal too', async () => {
  const { controller, events } = make({
    submit: async () => {
      throw new Error('operation_conflict')
    },
  })
  await controller.craft(150)
  assert.equal(last(events)[2].retryable, false)
})

test('blocked storage sends nothing', async () => {
  const storage = {
    getItem: () => null,
    setItem: () => {
      throw new Error('quota')
    },
  }
  const { controller, events, calls } = make({ storage })
  await controller.craft(150)
  assert.equal(calls.length, 0)
  assert.equal(last(events)[1], 'error')
})

test('an unreadable pending map sends nothing and keeps what is stored', async () => {
  const storage = memory()
  storage.setItem(pendingKey('local'), '{nope')
  const { controller, events, calls } = make({ storage })
  await controller.craft(150)
  assert.equal(calls.length, 0)
  assert.equal(last(events)[1], 'error')
  assert.equal(storage.getItem(pendingKey('local')), '{nope')
})

test('dispose drops a late result without erasing unresolved work', async () => {
  const storage = memory()
  const gate = deferred()
  const { controller, events } = make({
    storage,
    submit: async () => {
      await gate.promise
      throw new Error('offline')
    },
  })
  const run = controller.craft(150)
  controller.dispose()
  gate.resolve()
  await run
  assert.deepEqual(kinds(events), ['submitting'])
  assert.deepEqual(JSON.parse(storage.getItem(pendingKey('local'))), {
    150: OP1,
  })
})

test('owner keys cannot restore each other’s operations', async () => {
  const storage = memory()
  const a = make({
    storage,
    ownerKey: 'server:11111111-1111-4111-8111-111111111111',
    submit: async () => {
      throw new Error('offline')
    },
  })
  await a.controller.craft(150)
  const b = make({
    storage,
    ownerKey: 'server:22222222-2222-4222-8222-222222222222',
  })
  await b.controller.resume()
  assert.equal(b.calls.length, 0)
  assert.notEqual(
    pendingKey('server:11111111-1111-4111-8111-111111111111'),
    pendingKey('local')
  )
})

test('a receipt for another operation or species is uncertain, not success', async () => {
  const { controller, events } = make({
    submit: async () => receipt(OP2, 150),
  })
  await controller.craft(150)
  assert.equal(last(events)[1], 'uncertain')
})

test('a failing refresh after success does not undo the success', async () => {
  const { controller, events } = make({
    refresh: async () => {
      throw new Error('read down')
    },
  })
  await controller.craft(150)
  assert.equal(kinds(events).at(-1), 'success')
})

test('adapter: guest and checking are rejected before any write or RPC', async () => {
  const calls = []
  const supabase = { rpc: async (...a) => calls.push(a) }
  const journal = { craftLocalCard: async (...a) => calls.push(a) }
  for (const mode of ['guest', 'checking']) {
    await assert.rejects(
      craftCard({ mode, supabase, journal }, OP1, 150),
      /craft_unavailable/
    )
  }
  assert.deepEqual(calls, [])
})

test('adapter: server calls the RPC and returns a validated receipt; malformed ones are rejected', async () => {
  const rpc = async (name, args) => {
    rpc.last = [name, args]
    return { data: rpc.data, error: rpc.error ?? null }
  }
  rpc.data = receipt(OP1)
  assert.deepEqual(
    await craftCard({ mode: 'server', supabase: { rpc } }, OP1, 150),
    receipt(OP1)
  )
  assert.deepEqual(rpc.last, [
    'pokemon_craft_card',
    { p_operation: OP1, p_species: 150 },
  ])
  for (const bad of [
    null,
    receipt(OP2),
    receipt(OP1, 25),
    receipt(OP1, 150, { cardCount: 0 }),
    receipt(OP1, 150, { spent: 2 }),
    receipt(OP1, 150, { shardCount: -1 }),
  ]) {
    rpc.data = bad
    await assert.rejects(
      craftCard({ mode: 'server', supabase: { rpc } }, OP1, 150),
      /invalid_receipt/
    )
  }
  rpc.error = { message: 'insufficient_shards' }
  await assert.rejects(
    craftCard({ mode: 'server', supabase: { rpc } }, OP1, 150),
    { code: 'insufficient_shards' }
  )
})

test('adapter: local goes through the journal and is validated the same way', async () => {
  const journal = { craftLocalCard: async (op, s) => receipt(op, s) }
  assert.deepEqual(
    await craftCard({ mode: 'local', journal }, OP1, 150),
    receipt(OP1)
  )
  await assert.rejects(
    craftCard(
      { mode: 'local', journal: { craftLocalCard: async () => ({}) } },
      OP1,
      150
    ),
    /invalid_receipt/
  )
})
