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
