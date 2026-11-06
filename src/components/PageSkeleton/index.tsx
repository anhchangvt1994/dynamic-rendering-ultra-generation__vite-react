import LoadingPageComponent from 'components/LoadingPageComponent'
import AccountSkeleton from './AccountSkeleton'
import CompareSkeleton from './CompareSkeleton'
import HomeSkeleton from './HomeSkeleton'
import PokemonSkeleton from './PokemonSkeleton'
import QuizSkeleton from './QuizSkeleton'
import BagSkeleton from './BagSkeleton'
import KitchenSkeleton from './KitchenSkeleton'
import BlogSkeleton from './BlogSkeleton'
import BlogDetailSkeleton from './BlogDetailSkeleton'
import MyPokemonSkeleton from './MyPokemonSkeleton'

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
    case import.meta.env.ROUTER_BLOGS_ID:
      return <BlogSkeleton />
    case import.meta.env.ROUTER_BLOG_DETAIL_ID:
      return <BlogDetailSkeleton />
    case 'QuizPage':
      return <QuizSkeleton />
    case 'BagPage':
      return <BagSkeleton />
    case 'KitchenPage':
      return <KitchenSkeleton />
    case 'ComparePage':
      return <CompareSkeleton />
    case 'AccountPage':
      return <AccountSkeleton />
    case 'MyPokemonPage':
      return <MyPokemonSkeleton />
    default:
      return <LoadingPageComponent />
  }
}
