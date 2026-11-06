import { useEffect, useState } from 'react'
import AmberCard from '../crafting/AmberCard'
import { useModal } from 'pages/QuizPage/useModal'
import type { TradeReceipt } from './client'
import IndividualArt from './IndividualArt'
import {
  personalityLine,
  sizeLabel,
  sizeOf,
  starLabel,
  tintLabel,
} from './display.mjs'
import { nameError } from './messages.mjs'
import { DialogStyle } from './styles'

const MAX = 16

type Props = {
  receipt: TradeReceipt | null
  name: string
  save: (individualId: string, nickname: string) => Promise<unknown>
  onClose: () => void
}

/** The first meeting: the card breaks open, the individual steps out, it may be named. */
export default function WelcomeDialog({ receipt, name, save, onClose }: Props) {
  const ref = useModal(receipt !== null, onClose)
  const [nickname, setNickname] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const id = receipt?.individualId
  useEffect(() => {
    setNickname('')
    setError(null)
    setBusy(false)
  }, [id])
  if (!receipt) return <DialogStyle ref={ref} aria-label="Cá thể mới" />
  const { traits } = receipt
  const personality = personalityLine(traits.personality)
  const length = [...nickname].length
  const submit = async () => {
    if (busy || !length) return
    setBusy(true)
    setError(null)
    try {
      await save(receipt.individualId, nickname)
      ref.current?.close()
    } catch (e: any) {
      setError(nameError(e?.code ?? e?.message))
      setBusy(false)
    }
  }
  return (
    <DialogStyle
      ref={ref}
      aria-labelledby="welcome-title"
      data-dialog="welcome"
    >
      <div className="ind-panel">
        <h2 id="welcome-title">Một {name} của riêng bạn!</h2>
        <div className="ind-stage">
          <span className="ind-shell">
            <AmberCard
              speciesId={receipt.speciesId}
              name={name}
              count={3}
              required={3}
              complete
            />
          </span>
          <IndividualArt
            speciesId={receipt.speciesId}
            name={name}
            appearance={traits.appearance}
            size={160}
          />
        </div>
        <div className="ind-facts" role="status">
          <strong>Tính cách: {personality.name}</strong>
          <span>{personality.line}</span>
          <span className="ind-stars" aria-hidden="true">
            {'★'.repeat(traits.potential.stars)}
            {'☆'.repeat(5 - traits.potential.stars)}
          </span>
          <span>Tiềm năng: {starLabel(traits.potential.stars)}</span>
          <span>
            Sắc độ: {tintLabel(traits.appearance)} · Kích thước:{' '}
            {sizeLabel(sizeOf(receipt.individualId))}
          </span>
        </div>
        <form
          className="ind-field"
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <label htmlFor="welcome-nick">Đặt biệt danh (tuỳ chọn)</label>
          <input
            id="welcome-nick"
            value={nickname}
            maxLength={MAX}
            autoComplete="off"
            onChange={(event) => setNickname(event.target.value)}
            aria-describedby="welcome-count welcome-error"
          />
          <span className="ind-count" id="welcome-count">
            {length}/{MAX}
          </span>
          <span className="ind-error" id="welcome-error" role="alert">
            {error}
          </span>
          <span className="ind-actions">
            <button
              type="button"
              className="ind-btn"
              data-action="skip"
              onClick={() => ref.current?.close()}
            >
              Bỏ qua
            </button>
            <button
              type="submit"
              className="ind-btn ind-primary"
              data-action="save"
              aria-disabled={busy || !length || undefined}
            >
              Lưu tên
            </button>
          </span>
        </form>
      </div>
    </DialogStyle>
  )
}
