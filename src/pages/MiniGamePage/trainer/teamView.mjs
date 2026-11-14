import { MINIGAME, canJoinTeam, teamNeed } from '../minigame.mjs'

/**
 * Every Pokémon with whether it can join the team now, and why not.
 * `builds[id]` is `{level, bond}`; one not loaded yet counts as level 1.
 */
export function teamCandidates({ individuals, builds, trainerLevel }) {
  return individuals.map((individual) => {
    const { level = 1, bond = 1 } = builds[individual.id] ?? {}
    if (canJoinTeam({ trainerLevel, bond, pokemonLevel: level }))
      return { individual, ok: true, reason: null }
    const need = teamNeed(bond, level)
    return {
      individual,
      ok: false,
      reason:
        need > MINIGAME.LEVEL_MAX
          ? 'Cần thân thiết'
          : `Cần Lv ${Math.ceil(need)}`,
    }
  })
}
