import { useEffect, useState } from 'react'
import { getPokemonImage } from 'pages/PokemonPage/navigation.mjs'
import type { Traits } from './client'
import { artOffset } from 'pages/PokemonPage/artShift'
import { tintFilter } from './display.mjs'

type Props = {
  speciesId: number
  name: string
  appearance: Traits['appearance']
  size?: number
}

/**
 * One individual: the species artwork in its tint. A failed picture shows
 * the species' first letter. Decorative: the parent has the text.
 */
export default function IndividualArt({
  speciesId,
  name,
  appearance,
  size = 140,
}: Props) {
  const href = getPokemonImage(speciesId)
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [href])
  return (
    <span
      className="ind-art"
      data-failed={failed || undefined}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {failed ? (
        <span className="ind-letter">{name.charAt(0).toUpperCase()}</span>
      ) : (
        <img
          src={href}
          alt=""
          width={size}
          height={size}
          style={{
            filter: tintFilter(appearance),
            translate: `${-artOffset(speciesId)[0] * size}px ${-artOffset(speciesId)[1] * size}px`,
          }}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  )
}
