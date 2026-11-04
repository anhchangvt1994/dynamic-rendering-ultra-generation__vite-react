import { useModal } from 'pages/QuizPage/useModal'
import { DialogStyle } from './styles'

type Props = {
  speciesId: number | null
  name: string
  onConfirm: () => void
  onCancel: () => void
}

/** Required confirmation: a card is spent and does not come back. */
export default function TradeDialog({
  speciesId,
  name,
  onConfirm,
  onCancel,
}: Props) {
  const ref = useModal(speciesId !== null, onCancel)
  return (
    <DialogStyle ref={ref} aria-labelledby="trade-title" data-dialog="trade">
      <div className="ind-panel">
        <h2 id="trade-title">Đổi hổ phách thành Pokémon</h2>
        <p>
          Dùng 1 viên hổ phách {name} để nhận 1 {name} của riêng bạn. Không hoàn
          lại hổ phách.
        </p>
        <div className="ind-actions">
          <button
            type="button"
            className="ind-btn"
            data-action="cancel"
            onClick={() => ref.current?.close()}
          >
            Để sau
          </button>
          <button
            type="button"
            className="ind-btn ind-primary"
            data-action="confirm"
            onClick={() => {
              ref.current?.close()
              onConfirm()
            }}
          >
            Đổi
          </button>
        </div>
      </div>
    </DialogStyle>
  )
}
