// Daily quests: the catalog (equal to minigame_quest_catalog() in SQL; the
// quests test keeps them equal) and what the page shows from a quest row.
export const QUESTS = [
  { kind: 'quiz_win', goal: 2, xp: 8, label: 'Thắng 2 câu đố' },
  { kind: 'cook', goal: 1, xp: 6, label: 'Nấu 1 món ăn' },
  { kind: 'care', goal: 3, xp: 6, label: 'Chăm sóc Pokémon 3 lần' },
  { kind: 'evolve', goal: 1, xp: 15, label: 'Tiến hóa 1 Pokémon' },
  { kind: 'play', goal: 2, xp: 5, label: 'Chơi 2 ván mini-game' },
  { kind: 'win', goal: 1, xp: 8, label: 'Thắng 1 ván mini-game' },
  { kind: 'flawless', goal: 1, xp: 12, label: 'Thắng 1 ván không lật sai' },
]

export const STREAK_DAYS = 7

/** 'doing' until the goal is met, 'done' while the gift waits, then 'claimed'. */
export const questState = ({ progress, goal, claimed }) =>
  claimed ? 'claimed' : progress >= goal ? 'done' : 'doing'

/**
 * One flag per streak day. The streak already counts a claim made today, so
 * `claimedToday` does not add a dot; it is kept for callers that style today's.
 */
export const streakDots = (streak, _claimedToday) =>
  Array.from({ length: STREAK_DAYS }, (_, i) => i < Math.min(streak, STREAK_DAYS))
