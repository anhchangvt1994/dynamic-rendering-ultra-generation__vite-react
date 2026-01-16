import type { Params } from 'react-router'

export interface IRouteInfo {
  params: Params<string>
  query: { [key: string]: string | number } | undefined
  path: string | undefined
  fullPath: string | undefined
  id: string | undefined
  handle: {
    reProtect?: () => void
  }
}

export interface INavigateInfo {
  to: IRouteInfo | undefined
  from: IRouteInfo | undefined
}

export interface IRouteInit {
  id: string
  pathname: string
  params: Params<string>
  data: unknown
  handle: unknown
}

const INIT_NAVIGATE_INFO: INavigateInfo = {
  to: undefined,
  from: undefined,
}

const INIT_ROUTE_INFO: IRouteInfo = {
  params: {},
  query: undefined,
  path: undefined,
  fullPath: undefined,
  id: undefined,
  handle: {},
}

const INIT_ROUTE_INIT: IRouteInit = {
  id: '',
  pathname: '',
  params: {},
  data: undefined,
  handle: undefined,
}

export const NavigateInfoContext =
  createContext<INavigateInfo>(INIT_NAVIGATE_INFO)

export function useNavigateInfo() {
  const navigateInfo = useContext(NavigateInfoContext)
  return navigateInfo
}

export const RouteInfoContext = createContext<IRouteInfo>(INIT_ROUTE_INFO)

export function useRoute() {
  const routeInfo = useContext(RouteInfoContext)
  return routeInfo
}

export function useParamsAdvance() {
  const routeInfo = useContext(RouteInfoContext)

  return routeInfo.params
}

export function useSearchQueryAdvance() {
  const routeInfo = useContext(RouteInfoContext)

  return routeInfo.query
}

export const RouteInitContext = createContext<IRouteInit | undefined>(
  INIT_ROUTE_INIT
)

export function useRouteInit() {
  const routeInit = useContext(RouteInitContext)
  return routeInit
}
