import LoadingPageComponent from 'components/LoadingPageComponent'
import RoomSkeleton from 'pages/MyPokemonPage/room/RoomSkeleton'
import { MyPokemonStyle } from 'pages/MyPokemonPage/styles'

/** /pokemon-cua-toi/:id while its code loads: the room's own skeleton; the
 * bare list path only redirects, so it keeps the plain loader. */
export default function MyPokemonSkeleton() {
  // drawn by Layout, above the page's route: the deepest match has the id
  const matches = useMatches()
  const id = matches[matches.length - 1]?.params.id
  if (!id) return <LoadingPageComponent />
  return (
    <MyPokemonStyle data-tone="dark" data-room data-page-skeleton>
      <RoomSkeleton id={id} />
    </MyPokemonStyle>
  )
}
