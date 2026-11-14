import Layout from 'Layout'
import NotFoundPage from 'pages/NotFoundPage'
import { Navigate, RouteObject, useLocation } from 'react-router'
import { ServerStore } from 'store/ServerStore'
import { LoadingInfoProvider } from './context/LoadingInfoContext'
import { RouteObjectCustomize } from './types'
import defineRoute from './utils/DefineRoute'
import { ROUTE_MODULES } from './routeModules'
import RouterDeliver from './utils/RouterDeliver'
import RouterInit from './utils/RouterInit'
import RouterProtection from './utils/RouterProtection'
import RouterValidation from './utils/RouterValidation'
import ServerRouterHandler from './utils/ServerRouterHandler'

ServerStore.init()

// the quiz's first address: shared links (?gen=1&mode=hard) keep working
function QuizMoved() {
  const location = useLocation()
  return <Navigate to={`/whos-that-pokemon${location.search}`} replace />
}

// NOTE - Router Configuration
const routes: RouteObjectCustomize[] = defineRoute([
  {
    path: import.meta.env.ROUTER_BASE_PATH,
    element: (
      <LoadingInfoProvider>
        <ServerRouterHandler>
          <RouterInit>
            <RouterValidation NotFoundPage={NotFoundPage}>
              <RouterDeliver>
                <RouterProtection>
                  <Layout />
                </RouterProtection>
              </RouterDeliver>
            </RouterValidation>
          </RouterInit>
        </ServerRouterHandler>
      </LoadingInfoProvider>
    ),
    children: [
      {
        index: true,
        path: import.meta.env.ROUTER_HOME_PATH,
        element: <ROUTE_MODULES.home.Route />,
        id: import.meta.env.ROUTER_HOME_ID,
      }, // Home Page
      {
        path: import.meta.env.ROUTER_POKEMON_PATH,
        element: <ROUTE_MODULES.pokemon.Route />,
        id: import.meta.env.ROUTER_POKEMON_ID,
        handle: {
          params: {
            split(p, location) {
              return {
                name: p.name,
                id: location.state?.pokemonId,
              }
            },
          },
        },
      }, // Pokemon Page
      {
        path: import.meta.env.ROUTER_BLOGS_PATH,
        element: <ROUTE_MODULES.blogs.Route />,
        id: import.meta.env.ROUTER_BLOGS_ID,
      }, // Blog Page
      {
        path: import.meta.env.ROUTER_BLOG_DETAIL_PATH,
        element: <ROUTE_MODULES.blogDetail.Route />,
        id: import.meta.env.ROUTER_BLOG_DETAIL_ID,
      }, // Blog Detail Page
      {
        // Who's That Pokémon? quiz
        path: 'whos-that-pokemon',
        element: <ROUTE_MODULES.quiz.Route />,
        id: 'QuizPage',
      }, // Quiz Page
      {
        path: 'ai-day',
        element: <QuizMoved />,
        id: 'QuizMoved',
      }, // the quiz's first address
      {
        // the trainer's bag: the quiz's gifts
        path: 'tui-do',
        element: <ROUTE_MODULES.bag.Route />,
        id: 'BagPage',
      }, // Bag Page
      {
        // the kitchen: the bag's food cooked into dishes
        path: 'che-bien',
        element: <ROUTE_MODULES.kitchen.Route />,
        id: 'KitchenPage',
      }, // Kitchen Page
      {
        // the games a trainer plays with a Pokémon of their own
        path: 'mini-game',
        element: <ROUTE_MODULES.miniGame.Route />,
        id: 'MiniGamePage',
      }, // Mini Game Page
      {
        // the floating archipelago: every region, its gyms, trainers and wild Pokémon
        path: 'ban-do',
        element: <ROUTE_MODULES.map.Route />,
        id: 'MapPage',
      }, // Map Page
      {
        // the individuals a player got from amber: /pokemon-cua-toi, /pokemon-cua-toi/:id
        path: 'pokemon-cua-toi/:id?',
        element: <ROUTE_MODULES.myPokemon.Route />,
        id: 'MyPokemonPage',
      }, // My Pokémon Page
      {
        // /so-sanh, /so-sanh/charizard, /so-sanh/charizard-vs-blastoise
        path: 'so-sanh/:pair?',
        element: <ROUTE_MODULES.compare.Route />,
        id: 'ComparePage',
      }, // Compare Page
      ...(ROUTE_MODULES.account
        ? [
            {
              // sign in / account (ENABLE_SUPABASE)
              path: 'dang-nhap',
              element: <ROUTE_MODULES.account.Route />,
              id: 'AccountPage',
            },
          ]
        : []), // Account Page
      {
        path: import.meta.env.ROUTER_NOT_FOUND_PATH,
        element: <NotFoundPage />,
      },
    ],
  },
])

const router = createBrowserRouter(routes as RouteObject[], {
  basename: '/',
})

export default router
