// Not signed in (production): the quiz as a plain game. No turns, gifts,
// streak or bag, nothing stored; the rounds follow the same rules.
import { getCaught } from '../../../utils/caught.mjs'
import { getPokemonImage } from '../../PokemonPage/navigation.mjs'
import { cryOf } from './local.mjs'
import { drawRound, verdictOf } from './rules.mjs'

const NEUTRAL = {
  left: Infinity,
  refillAt: 0,
  streak: 0,
  records: 0,
  recordsTotal: 0,
  wins: 0,
  used: 0,
  bonus: 0,
  windowGifts: [],
  rerollsLeft: Infinity,
  timeLeft: 0,
  timeRefillAt: 0,
  pending: null,
  chests: [],
}

export function createGuestEngine({
  random = Math.random,
  now = () => Date.now(),
  // what the player caught in this browser picks the answers (no rewards)
  collection = () => getCaught(),
} = {}) {
  let current = null
  let recent = { ids: [], veil: undefined }
  const newRound = ({ from, to, hard }) => {
    const drawn = drawRound(random, {
      from,
      to,
      hard,
      recent: recent.ids,
      lastVeil: recent.veil,
      collection: collection(),
    })
    recent = {
      ids: [drawn.answerId, ...recent.ids].slice(0, 30),
      veil: drawn.veil,
    }
    current = {
      ...drawn,
      gifts: [],
      bonus: -1,
      id: `guest-${now()}`,
      startedAt: now(),
      from,
      to,
    }
    return {
      ...current,
      elapsedMs: 0,
      frozenAtMs: null,
      freezeLeftMs: 0,
      removed: [],
      letter: null,
    }
  }
  return {
    kind: 'guest',
    rewards: false,
    async status() {
      return NEUTRAL
    },
    async start(options) {
      return newRound(options)
    },
    async reroll(round) {
      if (!current || current.id !== round.id) throw new Error('no_round')
      return newRound(current)
    },
    // the Roar of Time is for players with an account (or yarn dev)
    async timeStop() {
      throw new Error('no_time')
    },
    async timeRefill() {
      throw new Error('no_time')
    },
    async answer(round, choice) {
      if (!current || current.id !== round.id) throw new Error('answered')
      const played = current
      current = null
      const result = verdictOf(played, choice, now() - played.startedAt)
      return {
        ...result,
        gift: null,
        missed: null,
        lucky: false,
        answerId: played.answerId,
        chests: [],
        status: NEUTRAL,
      }
    },
    // guests earn nothing: no journal, no call
    async claimShard(roundId) {
      return {
        roundId,
        speciesId: 1,
        state: 'ineligible',
        count: 0,
        required: null,
        drop: null,
      }
    },
    async reconcileShards() {
      return []
    },
    async openChests() {},
    async claimChestShards() {
      throw new Error('no_chest')
    },
    async reconcileChestShards() {
      return []
    },
    art: (round) => getPokemonImage(round.answerId),
    cry: (round) => cryOf(round.answerId),
  }
}
