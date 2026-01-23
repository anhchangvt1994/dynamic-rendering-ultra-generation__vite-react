const useScrollInfinity = (
  onAction: (initObserver, getOnIntersection) => void | (() => void),
  dependencies
) => {
  const _dependencies = dependencies || []

  const _getOnIntersection = (action) => {
    return (entries) => {
      const firstEntry = entries[0] || null
      if (firstEntry && firstEntry.isIntersecting) {
        action?.()
      }
    }
  } // _getOnIntersection

  const _initObserver = (scrollAnchor, onIntersection) => {
    if (!scrollAnchor) return

    const observer = new IntersectionObserver(onIntersection)

    if (observer) {
      observer.observe(scrollAnchor)
    }

    return observer
  } // _initObserver

  React.useEffect(() => {
    const destroy = onAction(_initObserver, _getOnIntersection)

    return () => {
      if (typeof destroy === 'function') {
        destroy()
      }
    }
  }, [onAction, ..._dependencies])
} // useScrollInfinity

export default useScrollInfinity
