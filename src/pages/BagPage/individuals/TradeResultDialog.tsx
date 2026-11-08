import { useModal } from 'pages/QuizPage/useModal'
import type { TradeReceipt } from './client'
import IndividualArt from './IndividualArt'
import {
  paletteLabel,
  personalityLine,
  sizeLabel,
  sizeOf,
  starLabel,
} from './display.mjs'
import { DialogStyle } from './styles'

type Props = {
  receipts: TradeReceipt[] | null
  name: string
  onClose: () => void
}

/** Several individuals from one batch, met together; a long list scrolls. */
export default function TradeResultDialog({ receipts, name, onClose }: Props) {
  const ref = useModal(receipts !== null, onClose)
  if (!receipts) return <DialogStyle ref={ref} aria-label="Cá thể mới" />
  return (
    <DialogStyle
      ref={ref}
      aria-labelledby="trade-result-title"
      data-dialog="trade-result"
    >
      <div className="ind-panel">
        <h2 id="trade-result-title">
          Đã đổi {receipts.length} {name} của riêng bạn!
        </h2>
        <ul
          className="ind-list ind-results"
          tabIndex={0}
          aria-label="Cá thể mới"
        >
          {receipts.map(({ individualId, speciesId, traits }) => (
            <li className="ind-item" key={individualId}>
              <IndividualArt speciesId={speciesId} name={name} size={72} />
              <span className="ind-item-main">
                <strong>
                  Tính cách: {personalityLine(traits.personality).name}
                </strong>
                <span>
                  {'★'.repeat(traits.potential.stars)}
                  {'☆'.repeat(5 - traits.potential.stars)} ·{' '}
                  {starLabel(traits.potential.stars)}
                </span>
                <span>
                  {paletteLabel(traits.appearance)} ·{' '}
                  {sizeLabel(sizeOf(individualId))}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <div className="ind-actions">
          <button
            type="button"
            className="ind-btn ind-primary"
            data-action="close"
            onClick={() => ref.current?.close()}
          >
            Xong
          </button>
        </div>
      </div>
    </DialogStyle>
  )
}
