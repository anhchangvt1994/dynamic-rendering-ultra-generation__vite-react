import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  TRADE_TERMINAL,
  createTradeController,
  nameIndividual,
  tradeCard,
  tradePendingKey,
} from './operations.mjs'

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
