import { parseChestReceipt } from './chestReceipt.mjs'

export const SHARD_KEY = 'pokedex:quiz-shards-v1'
export const validOperation = (value) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
export const validSpecies = (value) =>
  Number.isInteger(value) && value >= 1 && value <= 1025
const map = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const count = (value) => Number.isSafeInteger(value) && value >= 0
export const validCraftReceipt = (r) =>
  map(r) &&
  validOperation(r.operationId) &&
  validSpecies(r.speciesId) &&
  Number.isInteger(r.spent) &&
  r.spent >= 3 &&
  r.spent <= 20 &&
  count(r.shardCount) &&
  count(r.cardCount) &&
  r.cardCount > 0

const stamp = (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v))
const integer = (value, min, max) =>
  Number.isInteger(value) && value >= min && value <= max
const validMark = (m) =>
  m === null ||
  (map(m) &&
    ['freckle', 'stripe', 'patch', 'scar', 'star'].includes(m.kind) &&
    integer(m.x, 30, 70) &&
    integer(m.y, 30, 70) &&
    integer(m.size, 12, 24) &&
    integer(m.rot, 0, 359))
export const validTraits = (t) =>
  map(t) &&
  integer(t.personality, 0, 11) &&
  map(t.appearance) &&
  t.appearance.v === 1 &&
  Number.isInteger(t.appearance.hue) &&
  integer(Math.abs(t.appearance.hue), 4, 10) &&
  integer(t.appearance.sat, -8, 8) &&
  integer(t.appearance.light, -4, 4) &&
  validMark(t.appearance.mark) &&
  map(t.potential) &&
  t.potential.v === 1 &&
  Array.isArray(t.potential.offsets) &&
  t.potential.offsets.length === 6 &&
  t.potential.offsets.every((n) => integer(n, -5, 5)) &&
  integer(t.potential.stars, 1, 5)
export const validTradeReceipt = (r) =>
  map(r) &&
  validOperation(r.operationId) &&
  validSpecies(r.speciesId) &&
  validOperation(r.individualId) &&
  count(r.cardCount) &&
  validTraits(r.traits)
export const validIndividualNameResult = (r) =>
  map(r) &&
  validOperation(r.individualId) &&
  (r.nickname === null ||
    (typeof r.nickname === 'string' && r.nickname.length > 0))
export const validIndividual = (i) =>
  map(i) &&
  validOperation(i.id) &&
  validSpecies(i.speciesId) &&
  (i.nickname === null || typeof i.nickname === 'string') &&
  validTraits({
    personality: i.personality,
    appearance: i.appearance,
    potential: i.potential,
  }) &&
  stamp(i.createdAt)

const unit = (v) => Number.isFinite(v) && v >= 0 && v < 1
const validEntropy = (e) =>
  map(e) &&
  unit(e.countRoll) &&
  Array.isArray(e.pieces) &&
  e.pieces.length === 3 &&
  e.pieces.every((p) => map(p) && unit(p.groupRoll) && unit(p.speciesRoll))
const validChestEvent = (key, e) => {
  if (!map(e) || key !== `${e.roundId}:${e.kind}` || !validEntropy(e.entropy))
    return false
  try {
    parseChestReceipt(e)
    return true
  } catch {
    return false
  }
}

export function readShardSnapshot(storage) {
  const raw = storage.getItem(SHARD_KEY)
  if (raw == null)
    return {
      version: 1,
      events: {},
      balances: {},
      cards: {},
      crafts: {},
      individuals: {},
      trades: {},
      chestEvents: {},
    }
  try {
    const s = JSON.parse(raw)
    if (!map(s) || s.version !== 1 || !map(s.events) || !map(s.balances))
      throw Error()
    const cards = Object.hasOwn(s, 'cards') ? s.cards : {}
    const crafts = Object.hasOwn(s, 'crafts') ? s.crafts : {}
    const individuals = Object.hasOwn(s, 'individuals') ? s.individuals : {}
    const trades = Object.hasOwn(s, 'trades') ? s.trades : {}
    if (!map(cards) || !map(crafts) || !map(individuals) || !map(trades))
      throw Error()
    for (const [id, one] of Object.entries(individuals))
      if (!validIndividual(one) || one.id !== id) throw Error()
    for (const [id, receipt] of Object.entries(trades))
      if (
        !validOperation(id) ||
        !validTradeReceipt(receipt) ||
        receipt.operationId !== id
      )
        throw Error()
    for (const balances of [s.balances, cards]) {
      for (const [id, n] of Object.entries(balances))
        if (!/^[1-9]\d*$/.test(id) || !validSpecies(Number(id)) || !count(n))
          throw Error()
    }
    for (const [id, receipt] of Object.entries(crafts))
      if (
        !validOperation(id) ||
        !validCraftReceipt(receipt) ||
        receipt.operationId !== id
      )
        throw Error()
    const chestEvents = s.chestEvents ?? {}
    if (!map(chestEvents)) throw Error()
    for (const [key, event] of Object.entries(chestEvents))
      if (!validChestEvent(key, event)) throw Error()
    return { ...s, cards, crafts, individuals, trades, chestEvents }
  } catch {
    throw Object.assign(Error('journal_corrupt'), { code: 'journal_corrupt' })
  }
}
