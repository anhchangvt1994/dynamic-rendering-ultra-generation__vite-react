/**
 * The reroll badge at rest: a glossy toy Poké Ball whose centre button
 * carries a refresh mark, so the ball itself says "draw again". Shared by
 * the encounter card and the home skeleton.
 */
export default function RerollArt() {
  return (
    <span className="reroll-ball" aria-hidden="true">
      <span className="reroll-core">
        <svg viewBox="0 0 24 24">
          <path d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.75 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z" />
        </svg>
      </span>
    </span>
  )
}
