import { useEffect, useRef } from 'react'

export default function ReadyScreen({
  action,
  busy,
  onGo,
  rewards,
}: {
  action: 'start' | 'resume'
  busy: boolean
  onGo: () => void
  rewards: boolean
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
        {action === 'resume'
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
        onClick={onGo}
      >
        {action === 'resume' ? 'Tiếp tục' : 'Sẵn sàng'}
      </button>
    </div>
  )
}
