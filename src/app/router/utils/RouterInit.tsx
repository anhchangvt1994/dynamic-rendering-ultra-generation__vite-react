import { RouteInitContext } from 'app/router/context/InfoContext'

export default function RouterInit({ children }) {
  const location = useLocation()
  const matches = useMatches()
  const routeInit = matches.find((item) => item.pathname === location.pathname)

  return (
    <RouteInitContext.Provider value={routeInit}>
      {children}
    </RouteInitContext.Provider>
  )
}
