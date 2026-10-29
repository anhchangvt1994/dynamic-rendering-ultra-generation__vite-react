import {
  INavigateInfo,
  IRouteInfo,
  NavigateInfoContext,
  RouteInfoContext,
  useRouteInit,
} from 'app/router/context/InfoContext'
import type { Location, Params } from 'react-router'

let navigateInfo: INavigateInfo = {
  from: undefined,
  to: undefined,
}

function useSplitParams(location: Location): Params<string> {
  const matches = useMatches()
  const params = useParams()

  let newParams = {
    ...params,
  }

  matches.forEach(function (item) {
    const splitParams = (
      item as {
        handle?: {
          params?: {
            split: (params: Params, location: Location) => Params
          }
        }
      }
    )?.handle?.params?.split

    if (params && typeof splitParams === 'function') {
      newParams = {
        ...newParams,
        ...(splitParams(params, location) || {}),
      }
    }
  })

  return newParams
} // useSplitParams()

export default function RouterDeliver({ children }) {
  const location = useLocation()
  const routeInit = useRouteInit()
  const params = useSplitParams(location)
  // URLSearchParams handles escaped quotes, plus signs and malformed percent
  // sequences without constructing JSON from user-controlled query text.
  const query = location.search
    ? Object.fromEntries(new URLSearchParams(location.search))
    : undefined

  const routeInfo: IRouteInfo = {
    params,
    query,
    path: location.pathname,
    fullPath: location.pathname + location.search,
    id: routeInit?.id,
    handle: {},
  }

  navigateInfo = {
    from:
      navigateInfo.to && navigateInfo.to.fullPath !== routeInfo.fullPath
        ? navigateInfo.to
        : navigateInfo.from,
    to: routeInfo,
  }

  return (
    <RouteInfoContext.Provider value={routeInfo}>
      <NavigateInfoContext.Provider value={navigateInfo}>
        {children}
      </NavigateInfoContext.Provider>
    </RouteInfoContext.Provider>
  )
} // RouterDiliver()
