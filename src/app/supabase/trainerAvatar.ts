import { useEffect, useSyncExternalStore } from 'react'
import { getSupabase } from './client'

// The signed-in trainer's avatar for the header: a preset id, or 'custom' with its picture.
type Entry = { userId: string; avatar: string | null; image: string | null }
let current: Entry | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const inflight = new Set<string>()

/** The mini game / account page tell the header when the avatar is known or changes. */
export function setTrainerAvatar(userId: string, avatar: string | null, image?: string | null) {
  const keep = current?.userId === userId ? current.image : null
  const next = { userId, avatar, image: image === undefined ? keep : image }
  if (current && current.userId === userId && current.avatar === next.avatar && current.image === next.image) return
  current = next
  emit()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
const snapshot = () => current

/** Avatar of the trainer `userId` (own rows, RLS), fetched once per user. */
export function useTrainerAvatar(userId: string | undefined) {
  const state = useSyncExternalStore(subscribe, snapshot, () => null)
  const mine = userId && state?.userId === userId ? state : null
  const needs = !!userId && (!mine || (mine.avatar === 'custom' && !mine.image))
  useEffect(() => {
    if (!userId || !needs || inflight.has(userId)) return
    inflight.add(userId)
    getSupabase()
      .then(async (s) => {
        const profile = await s.from('trainer_profiles').select('avatar').eq('user_id', userId).maybeSingle()
        const avatar: string | null = profile.data?.avatar ?? null
        const image =
          avatar === 'custom'
            ? ((await s.from('trainer_avatar_images').select('image').eq('user_id', userId).maybeSingle()).data?.image ?? null)
            : null
        setTrainerAvatar(userId, avatar, image)
      })
      .catch(() => {})
      .finally(() => inflight.delete(userId))
  }, [userId, needs])
  return { avatar: mine?.avatar ?? null, image: mine?.image ?? null }
}
