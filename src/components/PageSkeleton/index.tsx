import LoadingPageComponent from 'components/LoadingPageComponent'
import AccountSkeleton from './AccountSkeleton'
import CompareSkeleton from './CompareSkeleton'
import HomeSkeleton from './HomeSkeleton'
import PokemonSkeleton from './PokemonSkeleton'
import QuizSkeleton from './QuizSkeleton'

export { default as HeaderSkeleton } from './HeaderSkeleton'

/**
 * The skeleton of a route's page. It is what the ISR loader snapshot shows
 * (RenderingInfo.loader) and what the app shows while that page's code
 * loads, so the two hand over without a flash.
 */
export default function PageSkeleton({ routeId }: { routeId?: string }) {
  switch (routeId) {
    case import.meta.env.ROUTER_HOME_ID:
      return <HomeSkeleton />
    case import.meta.env.ROUTER_POKEMON_ID:
      return <PokemonSkeleton />
    case 'QuizPage':
      return <QuizSkeleton />
    case 'ComparePage':
      return <CompareSkeleton />
    case 'AccountPage':
      return <AccountSkeleton />
    default:
      return <LoadingPageComponent />
  }
}
