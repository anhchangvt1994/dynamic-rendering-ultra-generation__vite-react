/** A rounded chevron, pointing left unless told otherwise. */
export default function Chevron({
  dir = 'left',
  size = 18,
}: {
  dir?: 'left' | 'right'
  size?: number
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      style={dir === 'right' ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path
        d="M15 5l-7 7 7 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
