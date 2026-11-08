import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  TRADE_TERMINAL,
  createTradeController,
  nameIndividual,
  tradeCard,
  tradePendingKey,
} from './operations.mjs'
import { tradeMessage } from './messages.mjs'

const memory = () => {
  const data = new Map()
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    data,
  }
}
const OP = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const OP2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const IND = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const traits = {
  personality: 3,
  appearance: {
    v: 3,
    palette: 'sky',
    shift: [
      [0, 0, 0],
      [1, -2, 3],
      [-8, 10, -6],
    ],
    marks: { kind: 'stripes', count: 6, seed: 42 },
  },
  potential: { v: 1, offsets: [0, 0, 0, 0, 0, 0], stars: 3 },
}
const receipt = (operationId = OP, speciesId = 25) => ({
  operationId,
  speciesId,
  individualId: IND,
  cardCount: 1,
  traits,
})
const make = (o = {}) => {
  const states = []
  const storage = o.storage ?? memory()
  const ids = [OP, OP2]
  const controller = createTradeController({
    ownerKey: o.ownerKey ?? 'local',
    storage,
    submit: o.submit ?? (async (op, species) => receipt(op, species)),
    refresh: o.refresh ?? (async () => {}),
    onState: (species, state) => states.push([species, state]),
    newId: o.newId ?? (() => ids.shift()),
  })
  return { controller, states, storage }
}
const last = (states, species = 25) =>
  states.filter(([s]) => s === species).at(-1)?.[1]
const pending = (storage, owner = 'local') =>
  JSON.parse(storage.getItem(tradePendingKey(owner)) ?? '{}')

test('batch trades use independent ids, continue after terminal failures, and retain uncertain operations', async () => {
  const ids = [OP, OP2, IND]
  const outcomes = []
  const { controller, states, storage } = make({
    newId: () => ids.shift(),
    mode: 'local',
    submit: async (op, species) => {
      outcomes.push(op)
      if (op === OP2) throw Object.assign(new Error('insufficient_cards'), { code: 'insufficient_cards' })
      if (op === IND) throw new Error('network')
      return receipt(op, species)
    },
  })
  const result = await controller.tradeMany(25, 3)
  assert.deepEqual(outcomes, [OP, OP2, IND])
  assert.deepEqual(result, {
    receipts: [receipt(OP, 25)],
    failures: [{ index: 2, kind: 'error', code: 'insufficient_cards' }, { index: 3, kind: 'uncertain' }],
    uncertain: true,
  })
  assert.deepEqual(
    JSON.parse(storage.getItem(`${tradePendingKey('local')}:batch`)),
    { 25: IND }
  )
  assert.deepEqual(states.filter(([, s]) => s.kind === 'success').map(([, s]) => s.receipt), [receipt(OP, 25)])
})

test('batch quantity clamps to available and rejects nonpositive counts', async () => {
  const { controller } = make()
  assert.deepEqual(await controller.tradeMany(25, 4, 2), {
    receipts: [receipt(OP, 25), receipt(OP2, 25)], failures: [], uncertain: false,
  })
  await assert.rejects(controller.tradeMany(25, 0), /invalid_quantity/)
})

test('batch retry reuses the uncertain operation id instead of minting another', async () => {
  const attempts = []
  const ids = [OP, OP2]
  const { controller, storage } = make({
    newId: () => ids.shift(),
    submit: async (id, species) => {
      attempts.push(id)
      if (attempts.length === 1) throw new Error('network')
      return receipt(id, species)
    },
  })
  await controller.tradeMany(25, 1)
  assert.deepEqual(await controller.retryMany(25), {
    receipts: [receipt(OP, 25)], failures: [], uncertain: false,
  })
  assert.deepEqual(attempts, [OP, OP])
  assert.deepEqual(JSON.parse(storage.getItem(`${tradePendingKey('local')}:batch`)), {})
})

test('resume replays persisted batch ids and returns their receipts', async () => {
  const storage = memory()
  storage.setItem(`${tradePendingKey('local')}:batch`, JSON.stringify({ 25: OP }))
  const attempts = []
  const { controller } = make({
    storage,
    submit: async (id, species) => (attempts.push(id), receipt(id, species)),
  })
  const results = await controller.resume()
  assert.deepEqual(attempts, [OP])
  assert.deepEqual(results, [{
    speciesId: 25,
    result: { receipts: [receipt(OP, 25)], failures: [], uncertain: false },
  }])
})

test('storage cleanup failure does not hide a committed batch receipt', async () => {
  const storage = memory()
  let writes = 0
  const setItem = storage.setItem
  storage.setItem = (key, value) => {
    writes += 1
    if (writes === 2) throw new Error('quota')
    setItem(key, value)
  }
  const { controller, states } = make({ storage })
  const result = await controller.tradeMany(25, 1)
  assert.deepEqual(result.receipts, [receipt(OP, 25)])
  assert.equal(states.find(([, state]) => state.kind === 'success')?.[1].receipt.operationId, OP)
})

test('dispose prevents later batch items and suppresses stale callbacks', async () => {
  const ids = [OP, OP2]
  let release
  const gate = new Promise((resolve) => { release = resolve })
  const calls = []
  const { controller, states } = make({
    newId: () => ids.shift(),
    submit: async (id, species) => {
      calls.push(id)
      if (calls.length === 1) await gate
      return receipt(id, species)
    },
  })
  const batch = controller.tradeMany(25, 2)
  controller.dispose()
  release()
  await batch
  assert.deepEqual(calls, [OP])
  assert.deepEqual(states.map(([, state]) => state.kind), ['submitting'])
})

test('client_outdated stops a batch and preserves the committed operation id', async () => {
  const ids = [OP, OP2]
  const calls = []
  const { controller, storage } = make({
    newId: () => ids.shift(),
    submit: async (id) => {
      calls.push(id)
      throw Object.assign(new Error('client_outdated'), { code: 'client_outdated' })
    },
  })
  const result = await controller.tradeMany(25, 2)
  assert.deepEqual(calls, [OP])
  assert.deepEqual(result.failures, [{ index: 1, kind: 'error', code: 'client_outdated' }])
  assert.deepEqual(JSON.parse(storage.getItem(`${tradePendingKey('local')}:batch`)), { 25: OP })
})

test('the pending key is its own, per owner', () => {
  assert.equal(
    tradePendingKey('server:u1'),
    'pokedex:individual-trade-pending-v1:server:u1'
  )
})
test('a trade writes its id before submitting and clears it on success', async () => {
  const seen = []
  const storage = memory()
  const { controller, states } = make({
    storage,
    submit: async (op, species) => {
      seen.push(pending(storage)[species])
      return receipt(op, species)
    },
  })
  await controller.trade(25)
  assert.deepEqual(seen, [OP])
  assert.equal(last(states).kind, 'success')
  assert.deepEqual(last(states).receipt, receipt())
  assert.deepEqual(pending(storage), {})
})
test('a lost answer keeps the id; the restored controller replays the same id and succeeds', async () => {
  const storage = memory()
  const first = make({
    storage,
    submit: async () => {
      throw new Error('network')
    },
  })
  await first.controller.trade(25)
  assert.equal(last(first.states).kind, 'uncertain')
  assert.deepEqual(pending(storage), { 25: OP })
  const ids = []
  const second = make({
    storage,
    submit: async (op, species) => (ids.push(op), receipt(op, species)),
  })
  await second.controller.resume()
  assert.deepEqual(ids, [OP])
  assert.equal(last(second.states).kind, 'success')
  assert.deepEqual(pending(storage), {})
})
test('an uncertain species never mints a new id on retry', async () => {
  const ids = []
  const { controller } = make({
    submit: async (op) => {
      ids.push(op)
      throw new Error('network')
    },
  })
  await controller.trade(25)
  await controller.retry(25)
  assert.deepEqual(ids, [OP, OP])
})
test('duplicate clicks share one request; different species are independent', async () => {
  let calls = 0
  let release
  const gate = new Promise((r) => (release = r))
  const { controller } = make({
    submit: async (op, species) => (calls++, await gate, receipt(op, species)),
  })
  const a = controller.trade(25)
  const b = controller.trade(25)
  const c = controller.trade(10)
  release()
  await Promise.all([a, b, c])
  assert.equal(calls, 2)
})
test('terminal codes clear the id and are final', async () => {
  for (const code of TRADE_TERMINAL) {
    const { controller, states, storage } = make({
      submit: async () => {
        throw Object.assign(new Error(code), { code })
      },
    })
    await controller.trade(25)
    assert.deepEqual(last(states), { kind: 'error', retryable: false, code })
    assert.deepEqual(pending(storage), {})
  }
  assert.ok(TRADE_TERMINAL.includes('insufficient_cards'))
  assert.ok(TRADE_TERMINAL.includes('not_found'))
})
test('an invalid or mismatched receipt is uncertain, the id kept', async () => {
  for (const bad of [null, receipt(OP2, 25), receipt(OP, 10)]) {
    const { controller, states, storage } = make({ submit: async () => bad })
    await controller.trade(25)
    assert.equal(last(states).kind, 'uncertain')
    assert.deepEqual(pending(storage), { 25: OP })
  }
})
test('blocked or corrupt storage sends nothing', async () => {
  let sent = 0
  const submit = async () => (sent++, receipt())
  const blocked = memory()
  blocked.setItem = () => {
    throw new Error('quota')
  }
  const a = make({ storage: blocked, submit })
  await a.controller.trade(25)
  assert.equal(last(a.states).code, 'storage_blocked')
  const corrupt = memory()
  corrupt.setItem(tradePendingKey('local'), '[1]')
  const b = make({ storage: corrupt, submit })
  await b.controller.trade(25)
  assert.equal(last(b.states).code, 'pending_unreadable')
  assert.equal(sent, 0)
})
test('dispose drops a late answer and keeps the pending id; owners are isolated', async () => {
  const storage = memory()
  let release
  const gate = new Promise((r) => (release = r))
  const { controller, states } = make({
    storage,
    submit: async (op, species) => (await gate, receipt(op, species)),
  })
  const running = controller.trade(25)
  controller.dispose()
  release()
  await running
  assert.deepEqual(
    states.map(([, s]) => s.kind),
    ['submitting']
  )
  const other = make({ storage, ownerKey: 'server:u2' })
  await other.controller.resume()
  assert.deepEqual(other.states, [])
})
test('adapter: guest and checking are refused before any call; receipt is validated', async () => {
  let calls = 0
  const supabase = {
    rpc: async () => (calls++, { data: receipt(), error: null }),
  }
  const journal = { tradeLocalCard: async () => (calls++, receipt()) }
  for (const mode of ['guest', 'checking', undefined])
    await assert.rejects(
      tradeCard({ mode, supabase, journal }, OP, 25),
      /trade_unavailable/
    )
  assert.equal(calls, 0)
  assert.deepEqual(
    await tradeCard({ mode: 'server', supabase, journal }, OP, 25),
    receipt()
  )
  assert.deepEqual(
    await tradeCard({ mode: 'local', supabase, journal }, OP, 25),
    receipt()
  )
  const bad = {
    rpc: async () => ({ data: { ...receipt(), traits: {} }, error: null }),
  }
  await assert.rejects(
    tradeCard({ mode: 'server', supabase: bad, journal }, OP, 25),
    /invalid_receipt/
  )
  const refused = {
    rpc: async () => ({ data: null, error: { message: 'insufficient_cards' } }),
  }
  await assert.rejects(
    tradeCard({ mode: 'server', supabase: refused, journal }, OP, 25),
    (e) => e.code === 'insufficient_cards'
  )
})
test('adapter: a receipt from a newer server is client_outdated, final, with its own words', async () => {
  const r = receipt()
  const newer = {
    rpc: async () => ({
      data: {
        ...r,
        traits: { ...r.traits, appearance: { v: 4, anything: true } },
      },
      error: null,
    }),
  }
  await assert.rejects(
    tradeCard({ mode: 'server', supabase: newer }, OP, 25),
    (e) => e.code === 'client_outdated'
  )
  assert.ok(TRADE_TERMINAL.includes('client_outdated'))
  assert.match(
    tradeMessage('Pikachu', { kind: 'error', code: 'client_outdated' }),
    /tải lại trang/
  )
})
test('adapter: server mode asks the species vibe first; its failure is ignored', async () => {
  const order = []
  const supabase = {
    rpc: async (name) => (order.push(name), { data: receipt(), error: null }),
  }
  const vibe = async (id) => (order.push(`vibe ${id}`), 'cute')
  assert.deepEqual(
    await tradeCard({ mode: 'server', supabase, vibe }, OP, 25),
    receipt()
  )
  assert.deepEqual(order, ['vibe 25', 'pokemon_trade_card'])
  for (const broken of [
    async () => Promise.reject(new Error('down')),
    () => {
      throw new Error('sync')
    },
    undefined,
  ])
    assert.deepEqual(
      await tradeCard({ mode: 'server', supabase, vibe: broken }, OP, 25),
      receipt()
    )
  let local = 0
  const journal = { tradeLocalCard: async () => receipt() }
  await tradeCard(
    { mode: 'local', journal, vibe: async () => (local++, 'cute') },
    OP,
    25
  )
  assert.equal(local, 0, 'the journal asks for itself')
})
test('adapter naming: result checked, invalid_nickname and not_found are terminal codes', async () => {
  const ok = {
    rpc: async (name, args) => ({
      data: { individualId: args.p_individual, nickname: args.p_nickname },
      error: null,
    }),
  }
  assert.deepEqual(
    await nameIndividual({ mode: 'server', supabase: ok }, IND, 'Pika'),
    { individualId: IND, nickname: 'Pika' }
  )
  const wrong = {
    rpc: async () => ({
      data: { individualId: OP, nickname: 'x' },
      error: null,
    }),
  }
  await assert.rejects(
    nameIndividual({ mode: 'server', supabase: wrong }, IND, 'x'),
    /invalid_receipt/
  )
  for (const code of ['invalid_nickname', 'not_found']) {
    const refuse = {
      rpc: async () => ({ data: null, error: { message: code } }),
    }
    await assert.rejects(
      nameIndividual({ mode: 'server', supabase: refuse }, IND, 'x'),
      (e) => e.code === code
    )
  }
  await assert.rejects(
    nameIndividual({ mode: 'guest' }, IND, 'x'),
    /trade_unavailable/
  )
  const journal = {
    nameLocalIndividual: async (id, n) => ({ individualId: id, nickname: n }),
  }
  assert.equal(
    (await nameIndividual({ mode: 'local', journal }, IND, 'Pika')).nickname,
    'Pika'
  )
})
test('a resumed trade after reload surfaces the receipt for the welcome', async () => {
  const storage = memory()
  storage.setItem(tradePendingKey('local'), JSON.stringify({ 25: OP }))
  const { controller, states } = make({ storage })
  await controller.resume()
  assert.deepEqual(last(states).receipt, receipt())
})

const withoutRandomUUID = async (fn) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
  const real = globalThis.crypto
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: { getRandomValues: (a) => real.getRandomValues(a) },
  })
  try {
    return await fn()
  } finally {
    Object.defineProperty(globalThis, 'crypto', original)
  }
}

test('batch trade works where crypto.randomUUID is missing (http on a LAN ip)', async () => {
  await withoutRandomUUID(async () => {
    const seen = []
    const states = []
    const controller = createTradeController({
      ownerKey: 'local',
      storage: memory(),
      submit: async (op, species) => {
        seen.push(op)
        return receipt(op, species)
      },
      onState: (species, state) => states.push([species, state]),
    })
    const result = await controller.tradeMany(25, 2, 2)
    assert.equal(result.receipts.length, 2)
    assert.equal(new Set(seen).size, 2)
    for (const id of seen) assert.match(id, /^[0-9a-f-]{36}$/)
  })
})

test('a failure before the request is reported, never swallowed', async () => {
  const states = []
  const summaries = []
  const controller = createTradeController({
    ownerKey: 'local',
    storage: memory(),
    submit: async (op, species) => receipt(op, species),
    newId: () => {
      throw new Error('no ids')
    },
    onState: (species, state) => states.push([species, state]),
    onBatch: (species, summary) => summaries.push(summary),
  })
  const result = await controller.tradeMany(25, 1, 1)
  assert.equal(result.receipts.length, 0)
  assert.deepEqual(result.failures, [
    { index: 1, kind: 'error', code: 'id_unavailable' },
  ])
  assert.equal(last(states).kind, 'error')
  assert.equal(summaries.length, 1)
})

test('batch successes are tagged so the page can show them as one group', async () => {
  const { controller, states } = make({ newId: (() => { const q = [OP, OP2]; return () => q.shift() })() })
  await controller.tradeMany(25, 2, 2)
  const successes = states.filter(([, s]) => s.kind === 'success')
  assert.equal(successes.length, 2)
  for (const [, s] of successes) assert.equal(s.batch, true)
})
