import { artOffset } from 'pages/PokemonPage/artShift'
import { getPokemonImage } from 'pages/PokemonPage/navigation.mjs'
import type { CSSProperties } from 'react'

type Props = {
  id: number
  className?: string
  style?: CSSProperties
  'data-ready'?: boolean
}

/** Species artwork, re-centred like IndividualArt but sized by its parent. */
export default function EvoArt({ id, className, style, ...rest }: Props) {
  const [ox, oy] = artOffset(id)
  return (
    <img
      src={getPokemonImage(id)}
      alt=""
      className={className}
      style={{ translate: `${-ox * 100}% ${-oy * 100}%`, ...style }}
      draggable={false}
      {...rest}
    />
  )
}
