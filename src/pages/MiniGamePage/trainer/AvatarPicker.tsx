import { useState } from 'react'
import { AVATARS, avatarUnlocked } from '../avatars.mjs'
import AvatarArt from './AvatarArt'

type Trainer = { level: number; avatar: string }

const need = (unlock: any) =>
  unlock.type === 'level'
    ? `Cần trainer level ${unlock.level}`
    : unlock.type === 'badge'
      ? 'Chưa mở'
      : ''

/** The twelve avatars; a locked one says what opens it. */
export default function AvatarPicker({
  trainer,
  onPick,
  onDone,
}: {
  trainer: Trainer
  onPick: (id: string) => Promise<void>
  onDone: () => void
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const state = { level: trainer.level, badges: [] as string[] }
  return (
    <>
      <ul className="tr-avatars">
        {AVATARS.map((a) => {
          const open = avatarUnlocked(a, state)
          return (
            <li key={a.id}>
              <button
                type="button"
                className="tr-avatar"
                aria-pressed={trainer.avatar === a.id}
                aria-disabled={!open || undefined}
                disabled={busy !== null}
                onClick={async () => {
                  if (!open) return setError(`${a.name}: ${need(a.unlock)}.`)
                  setBusy(a.id)
                  setError(null)
                  try {
                    await onPick(a.id)
                    onDone()
                  } catch (e: any) {
                    setError(e?.message ?? 'Không đổi được avatar.')
                  } finally {
                    setBusy(null)
                  }
                }}
              >
                <AvatarArt id={a.id} size={72} locked={!open} />
                <span>{a.name}</span>
                {!open && <small>{need(a.unlock)}</small>}
              </button>
            </li>
          )
        })}
      </ul>
      {error && (
        <p className="mg-error" role="alert">
          {error}
        </p>
      )}
    </>
  )
}
