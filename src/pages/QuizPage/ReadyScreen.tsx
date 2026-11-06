import { useEffect, useRef } from 'react'
import type { Chest } from './ChestDialog'

export default function ReadyScreen({
  action,
  busy,
  onGo,
  rewards,
  chests = [],
}: {
  action: 'start' | 'resume' | 'chest'
  busy: boolean
  onGo: () => void
  rewards: boolean
  chests?: Chest[]
}) {
  const button = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    button.current?.focus()
  }, [])
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
