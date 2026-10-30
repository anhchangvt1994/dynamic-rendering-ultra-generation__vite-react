import PokeBallArt from './PokeBallArt'

/**
 * The reroll badge at rest: a die-cut sticker of a Poké Ball with a small
 * "ĐỔI" ribbon, in the card's paper-and-ink style (like the type stamp).
 * Shared by the encounter card and the home skeleton.
 */
export default function RerollArt() {
  return (
    <span className="reroll-sticker" aria-hidden="true">
      <PokeBallArt className="reroll-ball" />
      <span className="reroll-tag">Đổi</span>
    </span>
  )
}
