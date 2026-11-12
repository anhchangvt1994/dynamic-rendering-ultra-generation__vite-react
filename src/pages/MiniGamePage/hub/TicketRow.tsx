import { useEffect, useRef, useState } from 'react'
import { shouldTear, ticketStates } from './tickets.mjs'

/** Per-game paper tickets: ready stubs, torn ones, one line of text. */
export default function TicketRow({ left, total, label }: { left: number | null; total: number; label: string }) {
  const states = ticketStates(left, total)
  const prev = useRef<number | null>(null)
  const [tear, setTear] = useState(-1)
  useEffect(() => {
    if (left !== null && shouldTear(prev.current, left)) setTear(left)
    if (left !== null) prev.current = left
  }, [left])
  return (
    <div className="hub-tickets" role="status">
      <span className="hub-stubs" data-many={total > 6 ? '' : undefined} aria-hidden="true">
        {states.map((s, i) => (
          <i key={i} className="hub-stub" data-state={s} data-tear={i === tear && s === 'torn' ? '' : undefined} />
        ))}
      </span>
      <span className="hub-ticket-text">{label}</span>
    </div>
  )
}
