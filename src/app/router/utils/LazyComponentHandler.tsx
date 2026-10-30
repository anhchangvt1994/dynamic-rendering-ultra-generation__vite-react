export function withLazy(
  f: () => Promise<{
    default: ComponentType<any>
  }>
) {
  try {
    if (typeof f === 'function') {
      const Component = lazy(f)
      return <Component />
    } else {
      throw Object.assign(
        new Error(
          'The param of withLazy function must be a Function return a Promise or a Dynamic Import that give a ComponentType'
        ),
        { code: 402 }
      )
    }
  } catch (err) {
    console.error(err)
  }
} // withLazy

/**
 * A route page loaded on demand that can also be fetched ahead
 * (`preload`). Once its module is in, the page renders straight away,
 * without suspending: React.lazy suspends at least once even for a module
 * already in cache, which would flash the skeleton.
 */
export function lazyRoute(
  load: () => Promise<{ default: ComponentType<any> }>
) {
  let Page: ComponentType<any> | undefined
  let pending: Promise<unknown> | undefined
  const preload = () =>
    (pending ??= load().then(
      (module) => {
        Page = module.default
      },
      (err) => {
        // a failed fetch (offline, new deploy) may be retried on next use
        pending = undefined
        throw err
      }
    ))

  function Route(props: Record<string, unknown>) {
    if (Page) return <Page {...props} />
    throw preload()
  }

  return { Route, preload }
} // lazyRoute
