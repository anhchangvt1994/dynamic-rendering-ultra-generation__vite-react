import { MINIGAME } from './minigame.mjs'

/** Exp bonus of the longest run of matches: 2% per match after the first, max 10%. */
export const comboBonus = (len) =>
  len >= 2 ? Math.min(MINIGAME.COMBO_MAX, MINIGAME.COMBO_STEP * (len - 1)) : 0

/** The run after a flip; `match` is null on the first card of a pair. */
export const nextRun = (run, match) =>
  match === null ? run : match ? run + 1 : 0
