import { useState } from 'react'
import GiftChest from '../GiftChest'
import { STREAK_DAYS, streakDots } from '../quests.mjs'
import type { ClaimReceipt, useMiniGame } from '../useMiniGame'
import { useQuests } from '../useQuests'

type Mg = ReturnType<typeof useMiniGame>
const SLOTS = 3

/** Quests region: three task rows and a 7-day stamp strip, same box in every state. */
export default function StampCard({ mg, guest }: { mg: Mg; guest: boolean }) {
  const { items, streak, claim } = useQuests(mg)
  const [pending, setPending] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [got, setGot] = useState<ClaimReceipt | null>(null)
  const [slam, setSlam] = useState<number | null>(null)

  const onClaim = async (slot: number) => {
    setPending(slot)
    setError(null)
    setSlam(null)
    try {
      setGot(await claim(slot))
    } catch (e: any) {
      setError(e?.message ?? String(mg.errors.network))
    } finally {
      setPending(null)
    }
  }
  const days = guest ? 0 : streak
  const dots = streakDots(days, items.some((i) => i.claimed))
  const note = guest
    ? 'Đăng nhập để nhận nhiệm vụ mỗi ngày.'
    : `Nhận nhiệm vụ mỗi ngày: đủ ${STREAK_DAYS} ngày nhận thêm quà lớn.`

  return (
    <section data-region="quests" style={{ ['--n' as string]: 4 }} aria-label="Nhiệm vụ hằng ngày">
      <div className="sc">
        <h2>Nhiệm vụ hằng ngày</h2>
        {guest ? (
          <div className="sc-lock">
            <b>Thẻ tem đang khóa</b>
            <span>Đăng nhập để nhận 3 nhiệm vụ và tem mỗi ngày.</span>
          </div>
        ) : (
          <ul className="sc-rows">
            {Array.from({ length: SLOTS }, (_, i) => {
              const q = items[i]
              if (!q) return <li key={`e${i}`} className="sc-row" data-empty />
              return (
                <li key={`${q.slot}-${q.kind}`} className="sc-row" data-state={q.state}>
                  <b>{q.label}</b>
                  {q.state === 'done' ? (
                    <button type="button" className="sc-go" disabled={pending !== null} onClick={() => onClaim(q.slot)}>
                      Nhận quà
                    </button>
                  ) : q.state === 'claimed' ? (
                    <span className="sc-stamp" data-slam={slam === q.slot || undefined} aria-label="Đã nhận">
                      ✓
                    </span>
                  ) : null}
                  {q.state === 'doing' ? (
                    <>
                      <small>
                        {q.progress}/{q.goal}
                      </small>
                      <span
                        className="sc-bar"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={q.goal}
                        aria-valuenow={q.progress}
                      >
                        <i style={{ transform: `scaleX(${Math.min(1, q.progress / q.goal)})` }} />
                      </span>
                    </>
                  ) : (
                    <small>+{q.xp} điểm huấn luyện viên</small>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        <ul className="sc-streak" aria-label={`Chuỗi ${days}/${STREAK_DAYS} ngày`}>
          {dots.map((on, i) => (
            <li key={i} className="sc-dot" data-on={on || undefined} data-big={i === STREAK_DAYS - 1 || undefined}>
              {i === STREAK_DAYS - 1 ? '🎁' : i + 1}
            </li>
          ))}
        </ul>
        <p className="sc-note" data-error={error ? '' : undefined} role={error ? 'alert' : undefined}>
          {error ?? note}
        </p>
        {got && (
          <div className="sc-gift">
            <GiftChest key={`${got.slot}-${got.streak}`} items={[...got.gift, ...(got.streakGift ?? [])]} />
            <button type="button" className="sc-done" onClick={() => {
                setSlam(got.slot)
                setGot(null)
              }}>
              Xong
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
