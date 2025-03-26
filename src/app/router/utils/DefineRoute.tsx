import RouterError from 'components/RouterError'
import { RouteObjectCustomize } from '../types'

const defineRoute = (
  routes: RouteObjectCustomize[]
): RouteObjectCustomize[] => {
  if (
    !routes ||
    !routes.length ||
    !routes[0].children ||
    !routes[0].children.length
  )
    return []

  if (
    routes.length > 0 &&
    routes[0].children &&
    routes[0].children.length > 0
  ) {
    const formatRoute = (routes) => {
      if (!routes || !routes.length) return

      const total = routes.length

      for (let i = 0; i < total; i++) {
        if (!routes[i].errorElement) {
          routes[i].errorElement = <RouterError />
        }

        if (LocaleInfo.langSelected || LocaleInfo.countrySelected) {
          if (
            (routes[i] && routes[i].path === '*') ||
            (routes[i] && routes[i].path === import.meta.env.ROUTER_LOGIN_PATH)
          )
            continue

          routes[i].path =
            routes[i].path === '/' ? ':locale' : `:locale/${routes[i].path}`
        }
      }
    } // formatRoute

    formatRoute(routes[0].children)
  }

  return routes
} // defineRoutes

export default defineRoute
