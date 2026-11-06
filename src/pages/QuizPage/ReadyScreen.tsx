import { useEffect, useRef } from 'react'
import type { Chest } from './ChestDialog'

/*
 * The card before a round. While the state loads ('loading', also drawn by
 * QuizSkeleton) it is the same card at the same size: the ball and the title
 * for real, bones where the words and the button will be.
 */
export default function ReadyScreen({
  action,
  busy = false,
  onGo,
  rewards = true,
  chests = [],
}: {
  action: 'loading' | 'start' | 'resume' | 'chest'
  busy?: boolean
  onGo?: () => void
  rewards?: boolean
  chests?: Chest[]
}) {
  const button = useRef<HTMLButtonElement>(null)
  const waiting = action === 'loading'
  useEffect(() => {
    if (!waiting) button.current?.focus()
  }, [waiting])
  if (waiting)
    return (
      <div
        className="ready-screen"
        role="status"
        aria-busy="true"
        data-tone="dark"
      >
        <span className="sr-only">Đang chuẩn bị câu đố…</span>
        <span className="ready-ball" aria-hidden="true" />
        <p className="title" aria-hidden="true">
          <span>Who’s that</span>
          <span>Pokémon?</span>
        </p>
        <span className="ready-lines" aria-hidden="true">
          <span className="bone" />
          <span className="bone" />
        </span>
        {!rewards && <p>Chơi thử không có phần thưởng.</p>}
        <span className="next ready-wait" aria-hidden="true">
          <span className="bone" />
        </span>
      </div>
    )
  return (
    <div className="ready-screen">
      <span className="ready-ball" aria-hidden="true" />
      <h1 className="title">
        <span>Who’s that</span>
        <span>Pokémon?</span>
      </h1>
      <p>
        {action === 'chest'
          ? chests.length > 1
            ? 'Bạn còn 2 rương quà chưa mở. Mở ngay để xem bên trong có gì.'
            : 'Bạn còn một rương quà chưa mở. Mở ngay để xem bên trong có gì.'
          : action === 'resume'
            ? 'Pokémon của lượt trước vẫn đang chờ bạn. Đồng hồ của lượt đó vẫn tiếp tục.'
            : 'Nhìn bóng đen, đoán tên Pokémon. Chỉ bắt đầu khi bạn sẵn sàng.'}
      </p>
      {!rewards && <p>Chơi thử không có phần thưởng.</p>}
      <button
        ref={button}
        className="next"
        type="button"
        disabled={busy}
        aria-busy={busy}
        data-chest={
          action === 'chest' ? chests[chests.length - 1]?.kind : undefined
        }
        onClick={onGo}
      >
        {action === 'chest'
          ? chests.length > 1
            ? 'Mở 2 quà ►'
            : 'Mở quà ►'
          : action === 'resume'
            ? 'Tiếp tục'
            : 'Sẵn sàng'}
      </button>
    </div>
  )
}
