// The browser game (yarn dev without a session): the rules of rules.mjs with
// everything kept in this browser's storage. Production never runs it.
import { getCaught } from '../../../utils/caught.mjs'
import { getPokemonImage } from '../../PokemonPage/navigation.mjs'
import { comboGifts, specialGifts } from '../items.mjs'
import {
  addToBag,
  addWin,
  currentTurns,
  giveTurn,
  readCount,
  readJSON,
  recordWin,
  refillAt,
  saveCount,
  saveJSON,
  spendTurn,
  turnsLeft,
} from '../progress.mjs'
import {
  MAX_REROLLS,
  RECENT,
  drawRound,
  freezeLeft,
  palkiaHint,
  palkiaRemoves,
  roundClock,
  spendTime,
  timeLeft,
  timeRefillAt,
  timeState,
  verdictOf,
} from './rules.mjs'
import {
  CATALOG_VERSION,
  RULE_VERSION,
  createShardJournal,
} from '../shards/local.mjs'

export const KEYS = {
  turns: 'pokedex:quiz-turns',
  round: 'pokedex:quiz-round',
  recent: 'pokedex:quiz-recent',
  bag: 'pokedex:bag',
  streak: 'pokedex:quiz-streak',
  records: 'pokedex:quiz-records',
  recordsTotal: 'pokedex:quiz-records-total',
  time: 'pokedex:quiz-time',
}

export const cryOf = (id) =>
  `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`

export function createLocalEngine({
  storage = globalThis.localStorage,
  random = Math.random,
  now = () => Date.now(),
  // the species the player has caught: the answers are drawn from them
  collection = () => getCaught(storage),
  // the shard drop has its own RNG and journal: the gifts never depend on it
  shardRandom = Math.random,
  shards = createShardJournal({ storage }),
} = {}) {
  const read = (key, fallback) => readJSON(key, fallback, storage)
  const save = (key, value) => saveJSON(key, value, storage)
  const turns = () => currentTurns(read(KEYS.turns, {}), now())
  const time = () => timeState(read(KEYS.time, {}), now())
  const play = (stored) => {
    const real = now() - stored.startedAt
    const frozenAtMs = stored.frozenAtMs ?? null
    return {
      ...stored,
      elapsedMs: Math.max(0, roundClock(real, frozenAtMs)),
      frozenAtMs,
      freezeLeftMs: freezeLeft(real, frozenAtMs),
      removed: stored.removed ?? [],
      letter: stored.letter ?? null,
    }
  }
  const status = (value = turns()) => {
    const pending = read(KEYS.round, null)
    return {
      left: turnsLeft(value),
      refillAt: refillAt(value),
      streak: readCount(KEYS.streak, storage),
      records: readCount(KEYS.records, storage),
      recordsTotal: readCount(KEYS.recordsTotal, storage),
      wins: value.wins ?? 0,
      used: value.used ?? 0,
      bonus: value.bonus ?? 0,
      windowGifts: value.gifts ?? [],
      rerollsLeft: Math.max(0, MAX_REROLLS - (value.rerolls ?? 0)),
      timeLeft: timeLeft(time()),
      timeRefillAt: timeRefillAt(time()),
      pending: pending?.answerId ? play(pending) : null,
    }
  }
  const newRound = ({ from, to, hard }, kept = {}) => {
    const recent = read(KEYS.recent, { ids: [], veil: undefined })
    const drawn = drawRound(random, {
      from,
      to,
      hard,
      recent: recent.ids,
      lastVeil: recent.veil,
      collection: collection(),
    })
    save(KEYS.recent, {
      ids: [drawn.answerId, ...recent.ids].slice(0, RECENT),
      veil: drawn.veil,
    })
    const stored = {
      ...drawn,
      ...kept,
      id: `local-${now()}-${drawn.answerId}`,
      shardRuleVersion: RULE_VERSION,
      shardCatalogVersion: CATALOG_VERSION,
      shardRoll: kept.shardRoll ?? shardRandom(),
      from,
      to,
      startedAt: now(),
    }
    save(KEYS.round, stored)
    return play(stored)
  }

  return {
    kind: 'local',
    rewards: true,
    async status() {
      return status()
    },
    async start(options) {
      const pending = read(KEYS.round, null)
      if (pending?.answerId) return play(pending)
      const value = turns()
      if (!turnsLeft(value)) throw new Error('no_turns')
      save(KEYS.turns, spendTurn(value, now()))
      return newRound(options)
    },
    async reroll(round) {
      const pending = read(KEYS.round, null)
      if (!pending || pending.id !== round.id) throw new Error('no_round')
      const value = turns()
      if ((value.rerolls ?? 0) >= MAX_REROLLS) throw new Error('no_rerolls')
      save(KEYS.turns, { ...value, rerolls: (value.rerolls ?? 0) + 1 })
      // the same gifts: a swap is no second draw at them
      return newRound(pending, {
        gifts: pending.gifts,
        bonus: pending.bonus,
        shardRoll: pending.shardRoll,
      })
    },
    async timeStop(round) {
      const pending = read(KEYS.round, null)
      if (!pending?.answerId || pending.id !== round.id)
        throw new Error('no_round')
      if (pending.frozenAtMs != null) throw new Error('time_used')
      const real = now() - pending.startedAt
      if (real >= pending.durationMs) throw new Error('time_over')
      const charges = time()
      if (!timeLeft(charges)) throw new Error('no_time')
      save(KEYS.time, spendTime(charges, now()))
      const stopped = {
        ...pending,
        frozenAtMs: real,
        removed: palkiaRemoves(random, pending),
        letter: palkiaHint(random, pending),
      }
      save(KEYS.round, stopped)
      return play(stopped)
    },
    async timeRefill() {
      if (turnsLeft(turns())) throw new Error('has_turns')
      const charges = time()
      if (!timeLeft(charges)) throw new Error('no_time')
      save(KEYS.time, spendTime(charges, now()))
      // a new window, as if the old one had run out
      save(KEYS.turns, {})
      return status()
    },
    async answer(round, choice) {
      const pending = read(KEYS.round, null)
      if (!pending || pending.id !== round.id) throw new Error('answered')
      const result = verdictOf(
        pending,
        choice,
        roundClock(now() - pending.startedAt, pending.frozenAtMs ?? null)
      )
      // the verdict goes in the journal while the round is still stored, so a
      // failed reward write below can not lose the entitlement; a journal that
      // fails never takes the original gift away
      const shard = await shards
        .recordLocalOutcome(pending, result.outcome)
        .catch(() => ({
          roundId: pending.id,
          speciesId: pending.answerId,
          state: 'unavailable',
        }))
      // two answers in flight: only the first still finds its round
      if (read(KEYS.round, null)?.id !== pending.id) throw new Error('answered')
      save(KEYS.round, null)
      let value = turns()
      const chests = []
      if (result.outcome === 'right') {
        const win = addWin({
          streak: readCount(KEYS.streak, storage),
          records: readCount(KEYS.records, storage),
        })
        if (win.combo) chests.push({ kind: 'combo', gifts: comboGifts(random) })
        if (win.special)
          chests.push({ kind: 'special', gifts: specialGifts(random) })
        let bag = addToBag(read(KEYS.bag, {}), [result.gift])
        for (const chest of chests) bag = addToBag(bag, chest.gifts)
        save(KEYS.bag, bag)
        value = recordWin(result.lucky ? giveTurn(value) : value, result.gift)
        saveCount(KEYS.streak, win.streak, storage)
        saveCount(KEYS.records, win.records, storage)
        if (win.combo)
          saveCount(
            KEYS.recordsTotal,
            readCount(KEYS.recordsTotal, storage) + 1,
            storage
          )
      } else saveCount(KEYS.streak, 0, storage)
      save(KEYS.turns, value)
      return {
        ...result,
        answerId: pending.answerId,
        shard,
        chests,
        status: status(value),
      }
    },
    claimShard: (roundId) => shards.claimLocalShard(roundId),
    async reconcileShards() {
      return []
    },
    art: (round) => getPokemonImage(round.answerId),
    cry: (round) => cryOf(round.answerId),
  }
}
