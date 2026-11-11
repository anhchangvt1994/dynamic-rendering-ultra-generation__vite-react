import { MINIGAME, xpFor } from '../minigame.mjs'

/** The xp bar of a trainer: percent to the next level, lit segments of 10, the next target. */
export function trainerProgress({ level, xp }) {
  const from = xpFor(level)
  const max = level >= MINIGAME.LEVEL_MAX
  const to = max ? from : xpFor(level + 1)
  const raw = to > from ? Math.round(((xp - from) / (to - from)) * 100) : 100
  const pct = Math.min(100, Math.max(0, raw))
  return { pct, lit: Math.round(pct / 10), max, to }
}
