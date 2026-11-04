// The bag's drawings, light enough for the skeletons' chunk: the backpack
// and one glyph per pocket (the skeleton draws them before the page loads).

export function Backpack() {
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true">
      {/* straps */}
      <path
        d="M58 70c-18 6-24 40-18 80M142 70c18 6 24 40 18 80"
        fill="none"
        stroke="#172d45"
        strokeWidth="10"
        strokeLinecap="round"
      />
      {/* handle */}
      <path
        d="M80 52c0-26 40-26 40 0"
        fill="none"
        stroke="#172d45"
        strokeWidth="9"
        strokeLinecap="round"
      />
      {/* body */}
      <rect
        className="bag-body"
        x="40"
        y="50"
        width="120"
        height="134"
        rx="34"
        stroke="#172d45"
        strokeWidth="6"
      />
      <path
        className="bag-shade"
        d="M132 56c16 6 25 20 25 40v54c0 16-8 28-22 31z"
      />
      {/* front pocket, with a Poké Ball patch */}
      <rect
        className="bag-shade"
        x="60"
        y="118"
        width="80"
        height="52"
        rx="16"
        stroke="#172d45"
        strokeWidth="5"
      />
      <rect
        x="66"
        y="124"
        width="68"
        height="40"
        rx="11"
        fill="none"
        stroke="rgba(255,255,255,.45)"
        strokeWidth="2"
        strokeDasharray="4 4"
      />
      <circle
        cx="100"
        cy="144"
        r="12"
        fill="#f4f4f4"
        stroke="#172d45"
        strokeWidth="4"
      />
      <path
        d="M88 144a12 12 0 0 1 24 0z"
        fill="#e5483b"
        stroke="#172d45"
        strokeWidth="4"
      />
      <circle
        cx="100"
        cy="144"
        r="4"
        fill="#f4f4f4"
        stroke="#172d45"
        strokeWidth="3"
      />
      {/* the flap, with its buckle: it lifts when a pocket opens */}
      <g className="bag-flap">
        <path
          className="bag-light"
          d="M40 86c0-22 14-36 36-36h48c22 0 36 14 36 36v10c-36 18-84 18-120 0z"
          stroke="#172d45"
          strokeWidth="6"
          strokeLinejoin="round"
        />
        <path
          d="M56 70c6-8 14-11 26-11"
          fill="none"
          stroke="rgba(255,255,255,.7)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <rect
          x="88"
          y="94"
          width="24"
          height="26"
          rx="6"
          fill="#ffda55"
          stroke="#172d45"
          strokeWidth="5"
        />
        <rect x="96" y="102" width="8" height="10" rx="2" fill="#172d45" />
      </g>
    </svg>
  )
}

const GLYPHS: Record<string, string> = {
  all: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  stat: 'M12 2.5 21 12h-5.5v9.5h-7V12H3z',
  friend: 'M12 21s-9-5.6-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.4-9 12-9 12z',
  evo: 'M7 3h10l4.5 6.5L12 21.5 2.5 9.5zM7.6 9.5h8.8L12 4.8z',
  heal: 'M9 2.5h6v6.5h6.5v6H15v6.5H9V15H2.5V9H9z',
  move: 'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 6.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8z',
  shards: 'M12 2 20 8.5 17 21H7L4 8.5z',
  dishes:
    'M2 11.5h20c0 4.6-3.3 8.4-7.5 9.3V22h-5v-1.2C5.3 19.9 2 16.1 2 11.5zM8 2.5h2.2v7H8zM13.8 2.5H16v7h-2.2z',
}

/** A pocket's sign, in the pocket tabs. */
export function PocketGlyph({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={GLYPHS[id] ?? GLYPHS.all} fillRule="evenodd" />
    </svg>
  )
}

/** The pockets as the skeleton draws them (bag.mjs would bring the catalogue). */
export const POCKET_TABS = [
  { id: 'all', label: 'Tất cả', color: '#ffda55' },
  { id: 'stat', label: 'Chỉ số', color: '#ff6a4a' },
  { id: 'friend', label: 'Thân thiện', color: '#ff8fc8' },
  { id: 'evo', label: 'Tiến hoá', color: '#ffb02e' },
  { id: 'heal', label: 'Hồi phục', color: '#4fd18b' },
  { id: 'move', label: 'Chiêu thức', color: '#4aa8ff' },
  { id: 'dishes', label: 'Món ăn', color: '#f07cb4' },
  { id: 'shards', label: 'Mảnh & hổ phách', color: '#c38bff' },
]

const SORT_GLYPHS: Record<string, string> = {
  // a star: the most precious first
  value:
    'M12 2.6 14.9 8.6 21.4 9.4 16.6 13.9 17.9 20.4 12 17.2 6.1 20.4 7.4 13.9 2.6 9.4 9.1 8.6z',
  // bars, tallest first
  count: 'M3 4h5v16H3zM9.5 9h5v11h-5zM16 14h5v6h-5z',
  // an A over a Z
  name: 'M6.2 2.5h2.6L13 13h-2.6l-.9-2.4H5.4L4.5 13H2zm1.3 2.9L6.2 8.6h2.6zM12 15h9.5v2l-6 3.5H22v2h-10v-2l6-3.5H12z',
}

/** An order's sign, in the sort switch. */
export function SortGlyph({ id }: { id: string }) {
  return (
    <svg className="sort-glyph" viewBox="0 0 24 24" aria-hidden="true">
      <path d={SORT_GLYPHS[id] ?? SORT_GLYPHS.value} fillRule="evenodd" />
    </svg>
  )
}

/** A Poké Ball's silhouette with a "?": the items not found yet. */
export function MissingGlyph() {
  return (
    <svg className="seek-glyph" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm-1.4 13.6v2.2h2.6v-2.2zM12 6.2c-2.1 0-3.6 1.2-3.8 3.2h2.4c.1-.8.6-1.2 1.4-1.2.8 0 1.3.5 1.3 1.1 0 .6-.3.9-1.1 1.4-1 .6-1.6 1.3-1.6 2.6v.4h2.4v-.3c0-.6.3-.9 1.1-1.4 1-.6 1.8-1.4 1.8-2.8 0-1.8-1.6-3-3.9-3z"
        fillRule="evenodd"
      />
    </svg>
  )
}
