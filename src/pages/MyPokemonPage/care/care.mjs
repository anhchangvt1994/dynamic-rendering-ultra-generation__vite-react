// The room's care rules (docs/superpowers/specs/2026-11-05-pokemon-room-care-design.md):
// needs that fall by the hour to a floor, feed / bathe / pet, affection levels
// and the stat cap. The database's care_* functions
// (supabase/migrations/20261113000000_pokemon_care.sql) apply the same rules:
// sqlParity.test.mjs keeps the constants equal.

export const CARE = {
  FLOOR: 25,
  MAX: 100,
  START: 60,
  DECAY_PER_HOUR: { hunger: 4, clean: 2, fun: 3 },
  FEED_HUNGER: 30,
  FULL_AT: 90,
  LIKED_FUN: 10,
  BATHE_CLEAN: 40,
  BATHE_COOLDOWN_MIN: 30,
  PET_FUN: 15,
  PET_WINDOW_MIN: 10,
  PET_LIMIT: 3,
  AFFECTION: { feed: 3, liked: 5, disliked: 0, bathe: 2, pet: 1 },
  LEVELS: [0, 10, 30, 60, 100, 150, 210, 280, 360, 450],
  CAP_BASE: 60,
  CAP_PER_STAR: 20,
  MOOD_WINDOW_MIN: 10,
  IGNORE_AFTER_H: 48,
  HUNGRY_BELOW: 40,
  HAPPY_AT: 60,
}

export const NEEDS = ['hunger', 'clean', 'fun']
export const STAT_KEYS = [
  'power',
  'beauty',
  'happiness',
  'agility',
  'wisdom',
  'friendship',
]

const MINUTE = 60_000
const round2 = (x) => Math.round(x * 100) / 100
const clampNeed = (x) => Math.min(CARE.MAX, Math.max(CARE.FLOOR, round2(x)))
const ms = (iso) => (iso ? Date.parse(iso) : NaN)

/** The care of an individual nobody has cared for yet. */
export function initialCare(createdAt) {
  return {
    needs: { hunger: CARE.START, clean: CARE.START, fun: CARE.START },
    needsAt: createdAt,
    affection: 0,
    stats: Object.fromEntries(STAT_KEYS.map((key) => [key, 0])),
    lastCaredAt: null,
    moodEvent: null,
    moodEventAt: null,
    petWindowStart: null,
    petWindowCount: 0,
    bathedAt: null,
  }
}

/** The needs now: each falls by its rate per hour, never under the floor. */
export function needsNow(state, now) {
  const hours = Math.max(0, (now.getTime() - ms(state.needsAt)) / 3_600_000)
  return Object.fromEntries(
    NEEDS.map((need) => [
      need,
      clampNeed(state.needs[need] - CARE.DECAY_PER_HOUR[need] * (hours || 0)),
    ])
  )
}

/** Affection level, 1 to 10. */
export const levelOf = (affection) =>
  CARE.LEVELS.filter((at) => affection >= at).length || 1

/** The affection the next level needs, null at level 10. */
export const nextLevelAt = (affection) =>
  CARE.LEVELS.find((at) => at > affection) ?? null

/** Each growth stat's ceiling: potential stars raise it. */
export const statCap = (stars) => CARE.CAP_BASE + CARE.CAP_PER_STAR * stars

/** What the room shows at a level: purely looks. */
export const unlocksAt = (level) => ({
  sticker: level >= 4,
  sparkles: level >= 7,
  gold: level >= 10,
})

const minutesSince = (iso, now) => (now.getTime() - ms(iso)) / MINUTE

/** Why an action can't be done now, or null. Petting is never blocked. */
export function blockedReason(state, action, now, dishCount) {
  if (action === 'feed') {
    if (needsNow(state, now).hunger >= CARE.FULL_AT) return 'Đang no'
    if (dishCount === 0) return 'Hết món, hãy nấu'
  }
  if (action === 'bathe' && state.bathedAt) {
    const left = CARE.BATHE_COOLDOWN_MIN - minutesSince(state.bathedAt, now)
    if (left > 0) return `Vừa tắm xong (còn ${Math.ceil(left)} phút)`
  }
  return null
}

// every action decays first, then adds
const touched = (state, now, needs, extra = {}) => ({
  ...state,
  needs,
  needsAt: now.toISOString(),
  lastCaredAt: now.toISOString(),
  ...extra,
})
const add = (needs, gains) =>
  Object.fromEntries(
    NEEDS.map((need) => [need, clampNeed(needs[need] + (gains[need] ?? 0))])
  )

/** Feed one dish: hunger, the dish's stats (capped by stars), taste. */
export function applyFeed(state, dish, taste, stars, now) {
  const cap = statCap(stars)
  const stats = { ...state.stats }
  for (const [key, points] of Object.entries(dish.stats ?? {}))
    if (key in stats)
      stats[key] = Math.max(stats[key], Math.min(cap, stats[key] + points))
  const needs = add(needsNow(state, now), {
    hunger: CARE.FEED_HUNGER,
    fun: taste === 'liked' ? CARE.LIKED_FUN : 0,
  })
  const gain =
    taste === 'liked'
      ? CARE.AFFECTION.liked
      : taste === 'disliked'
        ? CARE.AFFECTION.disliked
        : CARE.AFFECTION.feed
  return touched(state, now, needs, {
    stats,
    affection: state.affection + gain,
    ...(taste === 'neutral'
      ? {}
      : { moodEvent: taste, moodEventAt: now.toISOString() }),
  })
}

/** A bath: clean, then a cooldown. */
export function applyBathe(state, now) {
  return touched(
    state,
    now,
    add(needsNow(state, now), { clean: CARE.BATHE_CLEAN }),
    {
      affection: state.affection + CARE.AFFECTION.bathe,
      bathedAt: now.toISOString(),
    }
  )
}

/** A pet: fun, up to PET_LIMIT in a window; one more angers instead. */
export function applyPet(state, now) {
  const fresh =
    !state.petWindowStart ||
    minutesSince(state.petWindowStart, now) >= CARE.PET_WINDOW_MIN
  const needs = needsNow(state, now)
  if (!fresh && state.petWindowCount >= CARE.PET_LIMIT)
    return touched(state, now, needs, {
      petWindowCount: state.petWindowCount + 1,
      moodEvent: 'overpet',
      moodEventAt: now.toISOString(),
    })
  return touched(state, now, add(needs, { fun: CARE.PET_FUN }), {
    affection: state.affection + CARE.AFFECTION.pet,
    petWindowStart: fresh ? now.toISOString() : state.petWindowStart,
    petWindowCount: fresh ? 1 : state.petWindowCount + 1,
  })
}
