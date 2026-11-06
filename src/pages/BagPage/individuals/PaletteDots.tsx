import type { Appearance } from './client'
import { paletteOf } from './palettes.mjs'

type Props = { appearance: Appearance; speciesId: number }

/**
 * The palette as three overlapping coins (main, second, accent). Origin and
 * invert have no colours of their own: one coin of the species artwork,
 * inverted for invert. Decorative: the label beside it names the palette.
 */
export default function PaletteDots({ appearance, speciesId }: Props) {
  const p = paletteOf(appearance.palette)
  return (
    <span
      className="pd-dots"
      data-palette={p.key}
      data-effect={p.effect}
      aria-hidden="true"
    >
      {p.colors ? (
        p.colors.map((color, i) => (
          <i key={i} className="pd-dot" style={{ backgroundColor: color }} />
        ))
      ) : (
        <i
          className="pd-dot pd-art"
          style={{
            backgroundImage: `url(/api/image/${speciesId}.webp)`,
            filter:
              p.effect === 'invert'
                ? 'invert(1) hue-rotate(180deg)'
                : undefined,
          }}
        />
      )}
    </span>
  )
}
