export const getRoot = () => {
  const elRoot = document.getElementById('root')
  if (!elRoot) return

  if (elRoot.innerHTML) {
    const elRootTmp = document.createElement('div')
    let interval = setInterval(() => {
      if (elRootTmp.innerHTML) {
        clearInterval(interval)

        setTimeout(() => {
          if (
            !elRootTmp.innerHTML.includes('id="loading-page-component--global"')
          ) {
            return elRoot.replaceWith(elRootTmp)
          }

          interval = setInterval(() => {
            if (
              !elRootTmp.innerHTML.includes(
                'id="loading-page-component--global"'
              )
            ) {
              elRoot.replaceWith(elRootTmp)
              clearInterval(interval)
            }
          }, 50)
        }, 250)
      }
    })
    return createRoot(elRootTmp)
  }

  return createRoot(elRoot)
} // getRoot
