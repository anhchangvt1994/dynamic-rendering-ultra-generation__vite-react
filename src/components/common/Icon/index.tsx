// The site's few UI icons as inline SVG (Material Symbols outlines). They
// replace the Material Symbols web font, which blocked rendering and showed
// the words "menu" / "search" until (or unless) it loaded.
const PATHS = {
  menu: 'M3 18v-2h18v2Zm0-5v-2h18v2Zm0-5V6h18v2Z',
  search:
    'm19.6 21-6.3-6.3q-.75.6-1.725.95Q10.6 16 9.5 16q-2.725 0-4.612-1.888Q3 12.225 3 9.5t1.888-4.612Q6.775 3 9.5 3t4.613 1.888Q16 6.775 16 9.5q0 1.1-.35 2.075-.35.975-.95 1.725l6.3 6.3ZM9.5 14q1.875 0 3.188-1.312Q14 11.375 14 9.5q0-1.875-1.312-3.188Q11.375 5 9.5 5 7.625 5 6.312 6.312 5 7.625 5 9.5q0 1.875 1.312 3.188Q7.625 14 9.5 14Z',
  home: 'M6 19h3v-6h6v6h3v-9l-6-4.5L6 10Zm-2 2V9l8-6 8 6v12h-7v-6h-2v6Z',
  article:
    'M7 17h7v-2H7Zm0-4h10v-2H7Zm0-4h10V7H7ZM5 21q-.825 0-1.413-.587Q3 19.825 3 19V5q0-.825.587-1.413Q4.175 3 5 3h14q.825 0 1.413.587Q21 4.175 21 5v14q0 .825-.587 1.413Q19.825 21 19 21Zm0-2h14V5H5Z',
}

export type IconName = keyof typeof PATHS

export default function Icon({
  name,
  className = 'icon',
}: {
  name: IconName | string
  className?: string
}) {
  const d = PATHS[name as IconName]
  if (!d) return null
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  )
}
