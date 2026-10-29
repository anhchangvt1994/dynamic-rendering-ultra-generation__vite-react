import type { CSSProperties } from 'react'

export function Pokeball({
  className = '',
  style,
}: {
  className?: string
  style?: CSSProperties
}) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="20"
        cy="20"
        r="17"
        fill="white"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        d="M3 20a17 17 0 0 1 34 0Z"
        fill="#e94e43"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path d="M3 20h34" stroke="currentColor" strokeWidth="3" />
      <circle
        cx="20"
        cy="20"
        r="6"
        fill="white"
        stroke="currentColor"
        strokeWidth="3"
      />
    </svg>
  )
}

export default function FieldIcon({
  name,
  size = 20,
}: {
  name:
    | 'search'
    | 'arrow'
    | 'shuffle'
    | 'close'
    | 'grid'
    | 'check'
    | 'spark'
    | 'menu'
  size?: number
}) {
  const paths = {
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14m-6-6 6 6-6 6" />
      </>
    ),
    shuffle: (
      <>
        <path d="M3 6h3c5 0 6 12 11 12h4M3 18h3c2 0 3-2 4-4m4-4c1-2 2-4 4-4h3m-3-3 3 3-3 3m0 6 3 3-3 3" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    grid: (
      <>
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <rect x="14" y="14" width="6" height="6" rx="1" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    spark: (
      <path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z" />
    ),
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}
