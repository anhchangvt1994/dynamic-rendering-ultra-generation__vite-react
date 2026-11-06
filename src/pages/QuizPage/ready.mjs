// Reading status never starts a round; only the player's ready action does.
export function readyAction(status, outOfTurns) {
  if (!status) return 'loading'
  // a chest won and not opened (a reload in between) is opened first
  if (status.chests?.length) return 'chest'
  if (status.pending) return 'resume'
  if (status.left <= 0 || outOfTurns) return 'rest'
  return 'start'
}
