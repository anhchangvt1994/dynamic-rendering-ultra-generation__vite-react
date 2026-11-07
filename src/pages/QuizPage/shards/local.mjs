// The browser's shard journal (yarn dev without a session): one snapshot
// {version, events, balances} under one key, every change read-modify-written
// inside a Web Lock so two tabs can not both settle a round (over plain http
// on a LAN ip there is none: then a lock within the tab). Production and
// guests never use it.
import { shardRule, winsShard } from './rules.mjs'
import { randomId, webLock } from '../../../utils/secure.mjs'
import { drawChestShards } from './chestRewards.mjs'
import { parseChestReceipt } from './chestReceipt.mjs'
import { individualTraits } from '../../BagPage/individuals/traits.mjs'
import { normalizeNickname } from '../../BagPage/individuals/nickname.mjs'
import { speciesVibe } from '../../BagPage/individuals/speciesVibe.mjs'

import {
  SHARD_KEY,
  readShardSnapshot,
  validOperation,
  validSpecies,
} from './snapshot.mjs'
export { SHARD_KEY } from './snapshot.mjs'
export const RULE_VERSION = 2
export const CATALOG_VERSION = 1

const fail = (code, message = code) =>
  Object.assign(new Error(message), { code })

// the shipped catalog, loaded only when a claim needs it
const shippedCatalog = async (version, id) => {
  if (version !== CATALOG_VERSION) return undefined
  const { default: data } = await import('./catalog.json')
  return data.species.find((entry) => entry.id === id)
}

// a vibe lookup never fails a journal operation: no vibe draws from the pool
const safeVibe = async (vibe, speciesId) => {
  try {
    return (await vibe(speciesId)) ?? null
  } catch {
    return null
  }
}

/**
 * Brings every appearance older than v3 (individuals and trade receipts) to
 * the v3 its id and species' vibe give, in place. True when something
 * changed, so the caller saves.
 */
export async function upgradeSnapshot(snapshot, vibe = async () => null) {
  let changed = false
  for (const one of Object.values(snapshot.individuals ?? {}))
    if (one.appearance?.v !== 3) {
      const v = await safeVibe(vibe, one.speciesId)
      one.appearance = (await individualTraits(one.id, v)).appearance
      changed = true
    }
  for (const r of Object.values(snapshot.trades ?? {}))
    if (r.traits?.appearance?.v !== 3) {
      const v = await safeVibe(vibe, r.speciesId)
      r.traits.appearance = (await individualTraits(r.individualId, v)).appearance
      changed = true
    }
  return changed
}

export function createShardJournal({
  storage = globalThis.localStorage,
  lock = webLock(),
  catalog = shippedCatalog,
  chestCatalog = async () => (await import('./catalog.json')).default.species,
  randomUUID = () => randomId(),
  now = () => new Date(),
  vibe = speciesVibe,
} = {}) {
  const exclusive = (fn) => {
    if (!lock) return Promise.reject(fail('locks_unavailable'))
    return lock(SHARD_KEY, fn)
  }
  const load = () => readShardSnapshot(storage)
  // the reads that hand out individuals see v2 only
  const loadUpgraded = async () => {
    const snapshot = load()
    if (await upgradeSnapshot(snapshot, vibe)) save(snapshot)
    return snapshot
  }
  const save = (snapshot) =>
    storage.setItem(SHARD_KEY, JSON.stringify(snapshot))
  const receipt = (snapshot, event) => ({
    roundId: event.roundId,
    speciesId: event.speciesId,
    state: event.state,
    count: snapshot.balances[event.speciesId] ?? 0,
    required: event.required ?? null,
    drop: event.drop ?? null,
  })

  const settleChest = async (snapshot, key) => {
    const event = snapshot.chestEvents[key]
    if (!event) throw fail('no_chest')
    if (event.state === 'pending') {
      let selected
      try {
        selected = drawChestShards(
          event.kind,
          await chestCatalog(),
          event.entropy
        )
      } catch (error) {
        if (error.message === 'catalog_unavailable')
          return parseChestReceipt(event)
        throw error
      }
      for (const row of selected) {
        const next = (snapshot.balances[row.speciesId] ?? 0) + row.count
        if (!Number.isSafeInteger(next)) throw fail('balance_overflow')
        snapshot.balances[row.speciesId] = next
      }
      event.shards = selected
      event.state = 'awarded'
      save(snapshot)
    }
    return parseChestReceipt(event)
  }

  return {
    recordLocalChestRewards: (roundId, entitlements) =>
      exclusive(async () => {
        const snapshot = load()
        for (const { kind, entropy } of entitlements) {
          if (!['combo', 'special'].includes(kind)) throw fail('invalid_kind')
          const key = `${roundId}:${kind}`
          snapshot.chestEvents[key] ??= {
            roundId,
            kind,
            entropy,
            state: 'pending',
            shards: [],
          }
        }
        save(snapshot)
      }),
    claimLocalChestShards: (roundId, kind) =>
      exclusive(async () => settleChest(load(), `${roundId}:${kind}`)),
    reconcileLocalChestShards: () =>
      exclusive(async () => {
        const snapshot = load()
        const out = []
        for (const [key, event] of Object.entries(snapshot.chestEvents))
          if (event.state === 'pending')
            out.push(await settleChest(snapshot, key))
        return out
      }),
    // a card becomes an individual: its id is born here, its traits follow
    // from the id, and the receipt is stored so a replay gives it back
    tradeLocalCard: async (operationId, speciesId) => {
      if (!validOperation(operationId)) throw fail('invalid_operation')
      if (!validSpecies(speciesId)) throw fail('invalid_species')
      operationId = operationId.toLowerCase()
      // asked outside the lock: a slow network never holds other tabs
      const speciesVibeNow = await safeVibe(vibe, speciesId)
      return exclusive(async () => {
        const snapshot = await loadUpgraded()
        const prior = snapshot.trades[operationId]
        if (prior) {
          if (prior.speciesId !== speciesId) throw fail('operation_conflict')
          return prior
        }
        const owned = snapshot.cards[speciesId] ?? 0
        if (owned < 1) throw fail('insufficient_cards')
        const individualId = randomUUID().toLowerCase()
        const traits = await individualTraits(individualId, speciesVibeNow)
        snapshot.cards[speciesId] = owned - 1
        if (owned - 1 === 0) delete snapshot.cards[speciesId]
        snapshot.individuals[individualId] = {
          id: individualId,
          speciesId,
          nickname: null,
          personality: traits.personality,
          appearance: traits.appearance,
          potential: traits.potential,
          createdAt: now().toISOString(),
        }
        const result = {
          operationId,
          speciesId,
          individualId,
          cardCount: owned - 1,
          traits,
        }
        snapshot.trades[operationId] = result
        save(snapshot)
        return result
      })
    },
    nameLocalIndividual: (individualId, nickname) =>
      exclusive(async () => {
        const snapshot = load()
        const one = validOperation(individualId)
          ? snapshot.individuals[individualId.toLowerCase()]
          : undefined
        if (!one) throw fail('not_found')
        const name = normalizeNickname(nickname)
        if (!name.ok) throw fail(name.code)
        if (one.nickname !== name.value) {
          one.nickname = name.value
          save(snapshot)
        }
        return { individualId: one.id, nickname: one.nickname }
      }),
    listLocalIndividuals: (speciesId) =>
      exclusive(async () =>
        Object.values((await loadUpgraded()).individuals)
          .filter((i) => speciesId === undefined || i.speciesId === speciesId)
          .sort(
            (a, b) =>
              b.createdAt.localeCompare(a.createdAt) || (a.id < b.id ? 1 : -1)
          )
      ),
    craftLocalCard: (operationId, speciesId) =>
      exclusive(async () => {
        if (!validOperation(operationId)) throw fail('invalid_operation')
        if (!validSpecies(speciesId)) throw fail('invalid_species')
        operationId = operationId.toLowerCase()
        const snapshot = load()
        const prior = snapshot.crafts[operationId]
        if (prior) {
          if (prior.speciesId !== speciesId) throw fail('operation_conflict')
          return prior
        }
        const entry = await catalog(CATALOG_VERSION, speciesId)
        if (!entry) throw fail('missing_catalog')
        const { required } = shardRule(entry)
        const balance = snapshot.balances[speciesId] ?? 0
        if (balance < required) throw fail('insufficient_shards')
        const cardCount = (snapshot.cards[speciesId] ?? 0) + 1
        if (!Number.isSafeInteger(cardCount)) throw fail('balance_overflow')
        const result = {
          operationId,
          speciesId,
          spent: required,
          shardCount: balance - required,
          cardCount,
        }
        snapshot.balances[speciesId] = result.shardCount
        if (result.shardCount === 0) delete snapshot.balances[speciesId]
        snapshot.cards[speciesId] = cardCount
        snapshot.crafts[operationId] = result
        save(snapshot)
        return result
      }),
    // the verdict of a round, written before the round is dropped: the first
    // verdict wins, so a replay never re-rolls
    recordLocalOutcome: (round, outcome) =>
      exclusive(async () => {
        if (![1, 2].includes(round.shardRuleVersion))
          return {
            roundId: round.id,
            speciesId: round.answerId,
            state: 'ineligible',
            count: 0,
            required: null,
            drop: null,
          }
        const snapshot = load()
        const known = snapshot.events[round.id]
        if (known) return receipt(snapshot, known)
        const right = outcome === 'right'
        const event = {
          roundId: round.id,
          speciesId: round.answerId,
          ruleVersion: round.shardRuleVersion,
          catalogVersion: round.shardCatalogVersion,
          roll: right ? round.shardRoll : null,
          state: right ? 'pending' : 'ineligible',
          required: null,
          drop: null,
        }
        snapshot.events[round.id] = event
        save(snapshot)
        return receipt(snapshot, event)
      }),
    // settle a round's event against its pinned catalog version, once
    claimLocalShard: (roundId) =>
      exclusive(async () => {
        const snapshot = load()
        const event = snapshot.events[roundId]
        if (!event) throw fail('no_round')
        if (event.state !== 'pending') return receipt(snapshot, event)
        const entry = await catalog(event.catalogVersion, event.speciesId)
        if (!entry) return receipt(snapshot, event)
        const rule = shardRule(entry, event.ruleVersion)
        const won = winsShard(event.roll, rule.drop)
        const next = {
          ...snapshot,
          events: {
            ...snapshot.events,
            [roundId]: {
              ...event,
              state: won ? 'awarded' : 'not_awarded',
              required: rule.required,
              drop: rule.drop,
            },
          },
          balances: {
            ...snapshot.balances,
            ...(won
              ? {
                  [event.speciesId]:
                    (snapshot.balances[event.speciesId] ?? 0) + 1,
                }
              : {}),
          },
        }
        save(next)
        return receipt(next, next.events[roundId])
      }),
  }
}
