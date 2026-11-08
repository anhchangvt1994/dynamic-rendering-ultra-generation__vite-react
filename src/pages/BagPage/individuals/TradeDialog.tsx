import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { useModal } from 'pages/QuizPage/useModal'
import { DialogStyle } from './styles'

type Props = {
  speciesId: number | null
  name: string
  available: number
  onConfirm: (quantity: number) => void
  onCancel: () => void
}

const TradePanel = styled.div`
  .trade-counter {
    width: min(100%, 330px);
    padding: 16px;
    border: 1px solid rgba(255, 231, 160, 0.32);
    border-radius: 22px 22px 38px 22px;
    background:
      radial-gradient(
        ellipse at 50% 10%,
        rgba(255, 196, 70, 0.2),
        transparent 70%
      ),
      rgba(13, 25, 42, 0.88);
    box-shadow:
      inset 0 1px rgba(255, 255, 255, 0.12),
      0 12px 30px rgba(0, 0, 0, 0.2);
  }
  .trade-counter-label {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    color: #ffe9a3;
    font-size: 12px;
    font-weight: 700;
  }
  .trade-counter-label span:last-child {
    color: rgba(255, 248, 232, 0.72);
    font-variant-numeric: tabular-nums;
  }
  .trade-stepper {
    display: grid;
    grid-template-columns: 52px 1fr 52px;
    align-items: center;
    gap: 10px;
    margin-top: 12px;
  }
  .trade-stepper button {
    width: 52px;
    height: 52px;
    border: 1px solid rgba(255, 231, 160, 0.48);
    border-radius: 16px 16px 24px 16px;
    color: #fff8e8;
    background: rgba(255, 255, 255, 0.08);
    font: inherit;
    font-size: 26px;
    cursor: pointer;
  }
  .trade-stepper button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .trade-stepper button:focus-visible {
    outline: 3px solid #ffe9a3;
    outline-offset: 3px;
  }
  .trade-amount {
    display: grid;
    justify-items: center;
    color: #fff8e8;
    font-size: 46px;
    font-weight: 800;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .trade-amount small {
    margin-top: 7px;
    color: #ffe9a3;
    font-size: 11px;
    font-weight: 700;
    line-height: 1.3;
  }
  .trade-single {
    width: min(100%, 330px);
    padding: 12px 16px;
    border-left: 3px solid #f5b942;
    color: #fff8e8;
    background: rgba(255, 196, 70, 0.1);
    text-align: left;
  }
`

/** Required confirmation: a card is spent and does not come back. */
export default function TradeDialog({
  speciesId,
  name,
  available,
  onConfirm,
  onCancel,
}: Props) {
  const ref = useModal(speciesId !== null, onCancel)
  const [quantity, setQuantity] = useState(1)
  useEffect(() => setQuantity(1), [speciesId])
  return (
    <DialogStyle ref={ref} aria-labelledby="trade-title" data-dialog="trade">
      <div className="ind-panel">
        <h2 id="trade-title">Đổi hổ phách thành Pokémon</h2>
        <p>
          Dùng hổ phách {name} để nhận Pokémon của riêng bạn. Không hoàn lại hổ
          phách.
        </p>
        {available > 1 ? (
          <TradePanel className="trade-counter" aria-label="Chọn số Pokémon">
            <div className="trade-counter-label">
              <span>Chọn số Pokémon</span>
              <span>Còn {available} hổ phách</span>
            </div>
            <div className="trade-stepper">
              <button
                type="button"
                aria-label="Giảm số lượng"
                disabled={quantity <= 1}
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              >
                −
              </button>
              <output className="trade-amount" aria-live="polite">
                {quantity}
                <small>Pokémon</small>
              </output>
              <button
                type="button"
                aria-label="Tăng số lượng"
                disabled={quantity >= available}
                onClick={() =>
                  setQuantity((value) => Math.min(available, value + 1))
                }
              >
                +
              </button>
            </div>
          </TradePanel>
        ) : (
          <TradePanel className="trade-single">
            Bạn sẽ dùng viên hổ phách cuối cùng để nhận Pokémon này.
          </TradePanel>
        )}
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
            disabled={available < 1}
            onClick={() => {
              ref.current?.close()
              onConfirm(Math.min(quantity, available))
            }}
          >
            {available > 1 ? `Đổi ${quantity} Pokémon` : 'Đổi 1 Pokémon'}
          </button>
        </div>
      </div>
    </DialogStyle>
  )
}
