// What the Pokémon feels now, from its care (spec: "Cảm xúc"). The first
// rule that holds wins: angry, ignoring, hungry, sad, happy, glad.
import { CARE, needsNow } from './care.mjs'

export const MOODS = {
  angry: { emoji: '💢', label: 'Tức giận' },
  ignoring: { emoji: '😑', label: 'Làm ngơ' },
  hungry: { emoji: '🍖', label: 'Đói' },
  sad: { emoji: '😢', label: 'Buồn' },
  happy: { emoji: '🥰', label: 'Hạnh phúc' },
  glad: { emoji: '😊', label: 'Vui' },
}

const MINUTE = 60_000
const since = (iso, now) => (now.getTime() - Date.parse(iso)) / MINUTE

export function mood(state, createdAt, now) {
  const fresh =
    state.moodEventAt && since(state.moodEventAt, now) < CARE.MOOD_WINDOW_MIN
  const event = fresh ? state.moodEvent : null
  if (event === 'disliked' || event === 'overpet') return 'angry'
  if (since(state.lastCaredAt ?? createdAt, now) >= CARE.IGNORE_AFTER_H * 60)
    return 'ignoring'
  const needs = needsNow(state, now)
  if (needs.hunger < CARE.HUNGRY_BELOW) return 'hungry'
  if (needs.fun <= CARE.FLOOR) return 'sad'
  if (
    event === 'liked' &&
    Object.values(needs).every((value) => value >= CARE.HAPPY_AT)
  )
    return 'happy'
  return 'glad'
}
