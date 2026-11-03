import type { CSSProperties } from 'react'
import { hashAngle } from './text.mjs'

// inks of a field station's rubber stamps; a tag keeps its ink everywhere
const INKS = ['#b8372e', '#2a4d8f', '#2f7a4f', '#6b3f8f']
export const inkOf = (tag: string) =>
  INKS[Math.round((hashAngle(tag) + 1.5) * 10) % INKS.length]

/** A tag as a rubber stamp. */
export default function Stamp({
  tag,
  className = '',
}: {
  tag: string
  className?: string
}) {
  return (
    <span
      className={`stamp ${className}`}
      style={{ '--ink-stamp': inkOf(tag) } as CSSProperties}
    >
      {tag}
    </span>
  )
}
