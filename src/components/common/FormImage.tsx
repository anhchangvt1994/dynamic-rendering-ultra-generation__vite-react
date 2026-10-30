import { getFormImages, showNextImage } from 'pages/PokemonPage/navigation.mjs'
import type { ImgHTMLAttributes } from 'react'

/**
 * A Pokémon picture that never shows a hole. PokéAPI lacks some recent
 * forms' sprite (Zygarde Mega) or every image (Koraidon's ride builds):
 * it tries the sprite, the official artwork, then the species' artwork
 * (`baseId`), and hides itself if all fail. `small` puts the 2 KB sprite
 * first, for lists; otherwise the artwork comes first.
 */
export default function FormImage({
  pokemonId,
  baseId,
  small = false,
  ...img
}: {
  pokemonId: number
  baseId?: number
  small?: boolean
} & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'>) {
  const sources = getFormImages(pokemonId, baseId, { small })
  return (
    <img
      // keyed: a new Pokémon starts its fallback chain from the top
      key={pokemonId}
      {...img}
      src={sources[0]}
      onError={(event) => {
        const image = event.currentTarget
        if (!showNextImage(image, sources)) image.style.visibility = 'hidden'
      }}
    />
  )
}
