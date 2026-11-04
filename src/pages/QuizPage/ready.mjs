// Reading status never starts a round; only the player's ready action does.
export function readyAction(status, outOfTurns) {
  if (!status) return 'loading'
  if (status.pending) return 'resume'
  if (status.left <= 0 || outOfTurns) return 'rest'
  return 'start'
}
