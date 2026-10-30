// NOTE - Still a placeholder: the page's chunk has not rendered yet. The
// server's HTML (a full page or the loader snapshot) stays until it has.
const isPlaceholder = (html: string) =>
  html.includes('id="loading-page-component--global"') ||
  html.includes('data-page-skeleton')

export const getRoot = () => {
  const elRoot = document.getElementById('root')
  if (!elRoot) return

  if (elRoot.innerHTML) {
    const elRootTmp = document.createElement('div')
    let interval = setInterval(() => {
      if (elRootTmp.innerHTML) {
        clearInterval(interval)

        setTimeout(() => {
          if (!isPlaceholder(elRootTmp.innerHTML)) {
            return elRoot.replaceWith(elRootTmp)
          }

          interval = setInterval(() => {
            if (!isPlaceholder(elRootTmp.innerHTML)) {
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
