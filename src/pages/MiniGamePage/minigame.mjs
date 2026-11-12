// The mini game rules (docs/superpowers/specs/2026-11-11-minigame-platform-design.md):
// turns, rewards, care cost, trainer level and team. The database's
// minigame_* and trainer_* functions apply the same rules:
// sqlParity.test.mjs keeps the constants equal to minigame_rules().
import { levelOf } from '../MyPokemonPage/care/care.mjs'

export const MINIGAME = {
  TURNS: 5,
  REFILL_HOURS: 2,
  DURATION_S: 300,
  TOLERANCE_S: 5,
  MIN_HUNGER: 40,
  BASE_EXP: [6, 10, 16],
  BOND_STEP: 0.05,
  SPEED_MAX: 0.2,
  COMBO_STEP: 0.02,
  COMBO_MAX: 0.1,
  QUEST_SLOTS: 3,
  STREAK_DAYS: 7,
  LOSE_EXP_RATIO: 0.25,
  COST_WIN: { hunger: 8, clean: 4, fun: 5 },
  COST_LOSE: { hunger: 12, clean: 6, fun: 8 },
  XP_WIN: 10,
  XP_LOSE: 3,
  XP_SOURCE: { quiz: 5, cook: 3, care: 1, evolve: 15 },
  CARE_XP_DAILY: 10,
  LEVEL_MAX: 30,
  XP_CURVE: 40,
  XP_POWER: 1.5,
  TEAM_MAX: 6,
  TEAM_EVERY: 5,
  BOND_WEIGHT: 2,
  GRID: [
    { cols: 4, pairs: 6 },
    { cols: 4, pairs: 8 },
    { cols: 5, pairs: 10 },
  ],
  CHEST: [
    { size: 1, sure: 0 },
    { size: 2, sure: 1 },
    { size: 3, sure: 1 },
  ],
  CHEST_SURE_W: { 3: 92, 4: 8 },
  CHEST_REST_W: { 1: 40, 2: 48, 3: 10, 4: 2 },
  CANDY: {
    COLS: 6,
    ROWS: 7,
    KINDS: [4, 5, 6],
    MOVES: [20, 18, 16],
    TARGET: [3000, 3000, 2400],
    CELL: 10,
    TAPE: 1000,
    FLAWLESS_LEFT: 0.25,
  },
}

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x))

/** Trainer XP needed to reach `level`. */
export const xpFor = (level) =>
  Math.round(MINIGAME.XP_CURVE * (level - 1) ** MINIGAME.XP_POWER)

/** The trainer's level for a given XP total. */
export function trainerLevel(xp) {
  let level = 1
  while (level < MINIGAME.LEVEL_MAX && xp >= xpFor(level + 1)) level += 1
  return level
}

/** How many Pokémon fit in the team at this trainer level. */
export const slotsFor = (level) =>
  Math.min(
    MINIGAME.TEAM_MAX,
    1 + Math.floor(level / MINIGAME.TEAM_EVERY),
  )

/** The trainer level a Pokémon of `pokemonLevel` needs at this bond. */
export const teamNeed = (bond, pokemonLevel) =>
  pokemonLevel - MINIGAME.BOND_WEIGHT * bond

export const canJoinTeam = ({ trainerLevel: level, bond, pokemonLevel }) =>
  level >= teamNeed(bond, pokemonLevel)

/** Care level 1..10 of an affection total. */
export const bondOf = (affection) => levelOf(affection)

const baseExp = (d, bond) =>
  MINIGAME.BASE_EXP[d - 1] * (1 + MINIGAME.BOND_STEP * (bond - 1))

export function winExp({ d, bond, remainingS, combo = 0 }) {
  const left = clamp(remainingS, 0, MINIGAME.DURATION_S)
  const speed = (MINIGAME.SPEED_MAX * left) / MINIGAME.DURATION_S
  return Math.round(baseExp(d, bond) * (1 + speed + combo))
}

export const loseExp = ({ d, bond }) =>
  Math.round(MINIGAME.LOSE_EXP_RATIO * Math.round(baseExp(d, bond)))

export function careCost(win, d) {
  const per = win ? MINIGAME.COST_WIN : MINIGAME.COST_LOSE
  return { hunger: per.hunger * d, clean: per.clean * d, fun: per.fun * d }
}

export const trainerXp = (win, d) =>
  win ? MINIGAME.XP_WIN * d : MINIGAME.XP_LOSE

export const canPlay = (hunger) => hunger >= MINIGAME.MIN_HUNGER
