import type { ReactNode } from 'react'

type Look = {
  bg: [string, string]
  skin: string
  hair: string
  top: string
  /** drawn over the head */
  head?: ReactNode
  /** drawn over the shoulders */
  body?: ReactNode
  /** drawn behind the head */
  back?: ReactNode
  hairShape?: 'short' | 'long' | 'bun' | 'none'
}

const cap = (c: string, band: string) => (
  <>
    <path d="M30 40c0-12 8-19 20-19s20 7 20 19z" fill={c} />
    <path d="M26 41h48c3 0 3 4 0 4H28c-3 0-3-4-2-4z" fill={band} />
  </>
)
const star = (cx: number, cy: number, r: number, fill: string) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2
    const d = i % 2 ? r * 0.45 : r
    return `${(cx + Math.cos(a) * d).toFixed(1)},${(cy + Math.sin(a) * d).toFixed(1)}`
  })
  return <polygon points={pts.join(' ')} fill={fill} />
}

// Twelve trainers, one drawing language: a round badge, flat shapes, the same
// head and shoulders, and what each carries or wears is what tells them apart.
const LOOKS: Record<string, Look> = {
  rookie: {
    bg: ['#9fd8ff', '#4aa3e8'], skin: '#f2c9a0', hair: '#5a3a22', top: '#e8483b',
    head: cap('#e8483b', '#fff'),
    body: <path d="M38 80h24v16H38z" fill="#fff" opacity=".9" />,
  },
  scout: {
    bg: ['#c9f0a4', '#6cc04a'], skin: '#e0ab80', hair: '#2f2a24', top: '#3f8f4a',
    head: <path d="M27 42c4-14 12-20 23-20s19 6 23 20c-8-4-16-6-23-6s-15 2-23 6z" fill="#7a5a2c" />,
    body: <><circle cx="50" cy="84" r="5" fill="#ffd45e" /><path d="M36 78l28 18" stroke="#2c5c33" strokeWidth="4" /></>,
  },
  camper: {
    bg: ['#ffd9a0', '#f09a4a'], skin: '#f2c9a0', hair: '#8b4a1e', top: '#d9732f',
    head: <><path d="M32 40c2-12 9-18 18-18s16 6 18 18z" fill="#2e8a8a" /><circle cx="50" cy="20" r="4" fill="#f6e27a" /></>,
    body: <path d="M32 96l18-22 18 22z" fill="#f6e27a" opacity=".85" />,
  },
  hiker: {
    bg: ['#d9e3ea', '#8fa7b8'], skin: '#d99d73', hair: '#40342a', top: '#7a6048',
    head: <path d="M29 42c0-13 9-20 21-20s21 7 21 20c-6-3-14-5-21-5s-15 2-21 5z" fill="#b5532f" />,
    back: <rect x="26" y="66" width="48" height="30" rx="10" fill="#c4452c" />,
    body: <path d="M38 70v26M62 70v26" stroke="#3f3329" strokeWidth="4" />,
  },
  ranger: {
    bg: ['#bfe3c9', '#3f9b6a'], skin: '#c68b62', hair: '#25201c', top: '#2f6b4a',
    head: <><path d="M28 42c3-14 11-21 22-21s19 7 22 21z" fill="#3b7a53" /><path d="M24 42h52" stroke="#2a5a3c" strokeWidth="5" strokeLinecap="round" /></>,
    body: <><path d="M50 72v24" stroke="#f6e27a" strokeWidth="3" /><rect x="58" y="76" width="9" height="9" rx="2" fill="#f6e27a" /></>,
  },
  breeder: {
    bg: ['#ffd0e0', '#e8689b'], skin: '#f2c9a0', hair: '#7a3a1a', top: '#f6f0e8', hairShape: 'long',
    head: <><circle cx="33" cy="38" r="5" fill="#ff9ec0" /><circle cx="67" cy="38" r="5" fill="#ff9ec0" /></>,
    body: <path d="M40 72c4 6 16 6 20 0v24H40z" fill="#8fd4c8" />,
  },
  ace: {
    bg: ['#2a2f55', '#6a4fd0'], skin: '#f2c9a0', hair: '#1f1a2a', top: '#2a2f55',
    head: <path d="M30 42c0-13 8-20 20-20s20 7 20 20c-7-4-13-6-20-6s-13 2-20 6z" fill="#1f1a2a" />,
    body: <><path d="M38 72l12 12 12-12" fill="#fff" /><path d="M44 74l6 20 6-20z" fill="#ffd45e" />{star(50, 90, 4, '#ffd45e')}</>,
  },
  champion: {
    bg: ['#ffe9a0', '#e8a21f'], skin: '#d99d73', hair: '#2a1a12', top: '#8c1f2e',
    head: <path d="M32 30l6-12 6 9 6-13 6 13 6-9 6 12z" fill="#ffd45e" stroke="#b97b0e" strokeWidth="1.5" />,
    back: <path d="M22 96c2-14 8-24 28-24s26 10 28 24z" fill="#b3273a" />,
    body: <>{star(50, 86, 6, '#ffd45e')}</>,
  },
  duelist: {
    bg: ['#ffc2a6', '#e0502f'], skin: '#e0ab80', hair: '#1a1a1a', top: '#232323', hairShape: 'short',
    head: <path d="M30 40l8-4 6 5 6-6 6 6 6-5 8 4c-2-12-10-18-20-18s-18 6-20 18z" fill="#1a1a1a" />,
    body: <><path d="M36 74l28 22M64 74L36 96" stroke="#e0502f" strokeWidth="4" strokeLinecap="round" /></>,
  },
  sage: {
    bg: ['#d6c8ff', '#7a5ad8'], skin: '#f2c9a0', hair: '#f4f4f8', top: '#5b3fb5', hairShape: 'long',
    head: <><path d="M28 42c2-14 10-20 22-20s20 6 22 20c-6-4-14-6-22-6s-16 2-22 6z" fill="#f4f4f8" /><path d="M42 60q8 10 16 0" fill="none" stroke="#f4f4f8" strokeWidth="5" strokeLinecap="round" /></>,
    body: <path d="M50 72v24" stroke="#ffd45e" strokeWidth="3" />,
  },
  collector: {
    bg: ['#bfeeea', '#2fa6a0'], skin: '#c68b62', hair: '#3a2a1e', top: '#f0b43a',
    head: <><path d="M30 42c0-13 9-20 20-20s20 7 20 20c-6-3-13-5-20-5s-14 2-20 5z" fill="#3a2a1e" /><circle cx="42" cy="48" r="7" fill="none" stroke="#223" strokeWidth="2" /><circle cx="58" cy="48" r="7" fill="none" stroke="#223" strokeWidth="2" /><path d="M49 48h2" stroke="#223" strokeWidth="2" /></>,
    body: <>{[0, 1, 2].map((i) => <circle key={i} cx={40 + i * 10} cy="86" r="4" fill={['#e8483b', '#fff', '#4aa3e8'][i]} stroke="#223" strokeWidth="1" />)}</>,
  },
  captain: {
    bg: ['#ffb8b8', '#d63f4f'], skin: '#f2c9a0', hair: '#4a2a1a', top: '#1f3a7a',
    head: <><path d="M28 40c3-13 11-19 22-19s19 6 22 19z" fill="#fff" /><path d="M26 41h48" stroke="#1f3a7a" strokeWidth="5" strokeLinecap="round" />{star(50, 31, 5, '#d63f4f')}</>,
    body: <><path d="M32 78h36" stroke="#ffd45e" strokeWidth="3" />{star(40, 88, 3.5, '#ffd45e')}{star(60, 88, 3.5, '#ffd45e')}</>,
  },
}
const FALLBACK = LOOKS.rookie

/** A trainer's portrait; locked ones are muted. */
export default function AvatarArt({
  id,
  size = 64,
  locked = false,
}: {
  id: string
  size?: number
  locked?: boolean
}) {
  const look = LOOKS[id] ?? FALLBACK
  const gid = `av-${id}`
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      style={locked ? { filter: 'grayscale(1) brightness(0.7)' } : undefined}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={look.bg[0]} />
          <stop offset="1" stopColor={look.bg[1]} />
        </linearGradient>
        <clipPath id={`${gid}-clip`}>
          <circle cx="50" cy="50" r="48" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${gid}-clip)`}>
        <rect width="100" height="100" fill={`url(#${gid})`} />
        {look.back}
        <path d="M18 100c2-18 12-30 32-30s30 12 32 30z" fill={look.top} />
        {look.body}
        <rect x="44" y="58" width="12" height="14" rx="5" fill={look.skin} />
        <ellipse cx="50" cy="46" rx="19" ry="21" fill={look.skin} />
        {look.hairShape === 'long' && (
          <path d="M31 40c0-14 8-20 19-20s19 6 19 20v22c-3 2-6 2-8 0V44H39v18c-2 2-5 2-8 0z" fill={look.hair} />
        )}
        {(look.hairShape ?? 'short') === 'short' && (
          <path d="M31 42c0-14 8-21 19-21s19 7 19 21c-6-4-12-6-19-6s-13 2-19 6z" fill={look.hair} />
        )}
        <circle cx="43" cy="49" r="2.2" fill="#2a1d18" />
        <circle cx="57" cy="49" r="2.2" fill="#2a1d18" />
        <path d="M44 57q6 4 12 0" fill="none" stroke="#7a3f2c" strokeWidth="2" strokeLinecap="round" />
        {look.head}
      </g>
      <circle cx="50" cy="50" r="47" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="2" />
    </svg>
  )
}
