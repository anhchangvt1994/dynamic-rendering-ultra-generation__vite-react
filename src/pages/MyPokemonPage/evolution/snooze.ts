// "Để sau" holds for the tab's session, until the ready set changes (snoozeKey).
const PREFIX = 'pokedex:evolve-later:'

export function isSnoozed(key: string) {
  try {
    return sessionStorage.getItem(PREFIX + key) === '1'
  } catch {
    return false
  }
}

export function snooze(key: string) {
  try {
    sessionStorage.setItem(PREFIX + key, '1')
  } catch {
    // private mode or blocked storage: the badge keeps pulsing
  }
}
