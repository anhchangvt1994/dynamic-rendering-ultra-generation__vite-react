import { useEffect, useState } from 'react'
import { getPokemonImage } from 'pages/PokemonPage/navigation.mjs'
import { artOffset } from 'pages/PokemonPage/artShift'

type Props = {
  speciesId: number
  name: string
  size?: number
}

/**
 * One individual: the species artwork (its palette is drawn in the room
 * only). A failed picture shows the species' first letter. Decorative: the
 * parent has the text.
 */
export default function IndividualArt({ speciesId, name, size = 140 }: Props) {
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
            translate: `${-artOffset(speciesId)[0] * size}px ${-artOffset(speciesId)[1] * size}px`,
          }}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  )
}
