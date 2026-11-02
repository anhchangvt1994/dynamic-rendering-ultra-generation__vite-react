import type { KeyboardEvent } from 'react'

const STEP_KEYS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowDown: -1,
  '-': -1,
  ArrowRight: 1,
  ArrowUp: 1,
  '+': 1,
  '=': 1,
}

/**
 * How many portions to cook: − ×n + . The count in the middle says the most
 * the bag allows and jumps there in one tap ("Tối đa").
 */
export default function BatchStepper({
  count,
  max,
  disabled,
  onChange,
}: {
  count: number
  max: number
  disabled: boolean
  onChange: (count: number) => void
}) {
  const set = (next: number) => onChange(Math.min(max, Math.max(1, next)))
  const onKeyDown = (event: KeyboardEvent) => {
    const step = STEP_KEYS[event.key]
    if (!step) return
    event.preventDefault()
    set(count + step)
  }
  return (
    <div
      className="batch"
      role="group"
      aria-label="Số phần nấu"
      onKeyDown={onKeyDown}
    >
      <button
        type="button"
        className="batch-step"
        aria-label="Bớt một phần"
        disabled={disabled || count <= 1}
        onClick={() => set(count - 1)}
      >
        −
      </button>
      <button
        type="button"
        className="batch-count"
        aria-label={`${count} phần. Chọn tối đa ${max} phần`}
        aria-pressed={count === max}
        disabled={disabled}
        onClick={() => set(max)}
      >
        <b>×{count}</b>
        <small aria-hidden="true">tối đa {max}</small>
      </button>
      <button
        type="button"
        className="batch-step"
        aria-label="Thêm một phần"
        disabled={disabled || count >= max}
        onClick={() => set(count + 1)}
      >
        +
      </button>
    </div>
  )
}
