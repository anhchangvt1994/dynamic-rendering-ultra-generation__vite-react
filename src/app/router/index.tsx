import Layout from 'Layout'
import NotFoundPage from 'pages/NotFoundPage'
import { RouteObject } from 'react-router'
import { ServerStore } from 'store/ServerStore'
import { LoadingInfoProvider } from './context/LoadingInfoContext'
import { RouteObjectCustomize } from './types'
import defineRoute from './utils/DefineRoute'
import { withLazy } from './utils/LazyComponentHandler'
import RouterDeliver from './utils/RouterDeliver'
import RouterInit from './utils/RouterInit'
import RouterProtection from './utils/RouterProtection'
import RouterValidation from './utils/RouterValidation'
import ServerRouterHandler from './utils/ServerRouterHandler'

ServerStore.init()

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
        element: withLazy(() => import('pages/HomePage')),
      }, // Home Page
      {
        path: import.meta.env.ROUTER_POKEMON_PATH,
        element: withLazy(() => import('pages/PokemonPage')),
      }, // Pokemon Page
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
