import { useState } from 'react'
import { useAccount } from 'app/supabase/account'
import GiftChest from './GiftChest'
import { STREAK_DAYS, streakDots } from './quests.mjs'
import { QuestStyle } from './styles.quests'
import type { ClaimReceipt, useMiniGame } from './useMiniGame'
import { useQuests } from './useQuests'

/** Today's three quests, their gifts and the 7-day streak. */
export default function QuestCard({ mg }: { mg: ReturnType<typeof useMiniGame> }) {
  const account = useAccount()
  const { items, streak, claim } = useQuests(mg)
  const [pending, setPending] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [got, setGot] = useState<ClaimReceipt | null>(null)
  const server = mg.mode === 'server'

  if (!server) {
    if (account.status === 'off' || mg.mode === 'checking') return null
    return (
      <QuestStyle data-guest aria-label="Nhiệm vụ hằng ngày">
        <h2>Nhiệm vụ hằng ngày</h2>
        <p className="qc-note">Đăng nhập để nhận nhiệm vụ</p>
      </QuestStyle>
    )
  }
  if (items.length === 0) return null

  const onClaim = async (slot: number) => {
    setPending(slot)
    setError(null)
    try {
      setGot(await claim(slot))
    } catch (e: any) {
      setError(e?.message ?? mg.errors.network)
    } finally {
      setPending(null)
    }
  }
  const dots = streakDots(streak, items.some((i) => i.claimed))

  return (
    <QuestStyle aria-label="Nhiệm vụ hằng ngày">
      <h2>Nhiệm vụ hằng ngày</h2>
      <ul className="qc-list">
        {items.map((q) => (
          <li key={`${q.slot}-${q.kind}`} className="qc-row" data-state={q.state}>
            <b>{q.label}</b>
            {q.state === 'done' ? (
              <button
                type="button"
                className="qc-go"
                disabled={pending !== null}
                onClick={() => onClaim(q.slot)}
              >
                Nhận quà
              </button>
            ) : q.state === 'claimed' ? (
              <span className="qc-ok" aria-label="Đã nhận">✓</span>
            ) : (
              <small>
                {q.progress}/{q.goal}
              </small>
            )}
            {q.state === 'doing' && (
              <span
                className="qc-bar"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={q.goal}
                aria-valuenow={q.progress}
              >
                <i style={{ width: `${Math.round((q.progress / q.goal) * 100)}%` }} />
              </span>
            )}
            {q.state !== 'doing' && <small>+{q.xp} điểm huấn luyện viên</small>}
          </li>
        ))}
      </ul>
      <ul className="qc-streak" aria-label={`Chuỗi ${streak}/${STREAK_DAYS} ngày`}>
        {dots.map((on, i) => (
          <li
            key={i}
            className="qc-dot"
            data-on={on || undefined}
            data-big={i === STREAK_DAYS - 1 || undefined}
          >
            {i === STREAK_DAYS - 1 ? '🎁' : null}
          </li>
        ))}
      </ul>
      <p className="qc-note">Nhận nhiệm vụ mỗi ngày: đủ {STREAK_DAYS} ngày nhận thêm quà lớn.</p>
      {got && (
        <GiftChest key={`${got.slot}-${got.streak}`} items={[...got.gift, ...(got.streakGift ?? [])]} />
      )}
      {error && (
        <p className="qc-error" role="alert">
          {error}
        </p>
      )}
    </QuestStyle>
  )
}
