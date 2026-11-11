import { BADGES } from '../badges.mjs'

/** Every badge: earned ones lit with their date, the rest show how to earn. */
export default function BadgeShelf({ earned }: { earned: { id: string; at: string }[] }) {
  const at = new Map(earned.map((b) => [b.id, b.at]))
  return (
    <ul className="tr-badges">
      {BADGES.map((b) => {
        const when = at.get(b.id)
        return (
          <li key={b.id} className="tr-badge" data-on={when ? '' : undefined}>
            <b>{b.label}</b>
            <span>
              {when ? `Nhận ngày ${new Date(when).toLocaleDateString('vi-VN')}` : b.hint}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
