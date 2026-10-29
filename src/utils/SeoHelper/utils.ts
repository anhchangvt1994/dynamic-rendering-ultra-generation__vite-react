const seoHelperComment = (() => {
  let tmpSeoHelperComment
  for (let i = 0; i < document.head.childNodes.length; i++) {
    const node = document.head.childNodes[i]
    if (
      node.nodeType === 8 &&
      /^[\s?]*(seo helper)[\s?]*$/g.test(node.textContent as string)
    ) {
      tmpSeoHelperComment = node
      break
    }
  }

  return tmpSeoHelperComment
})() as Comment

export const generateTitleTag = (val) => {
  const el = document.head.getElementsByTagName('title')?.[0]

  if (el) el.remove()
  if (!val) return

  const title = document.createElement('title')
  title.innerHTML = val
  document.head.insertBefore(title, seoHelperComment)
} // generateTitleTag

export const generateMetaTag = (name, val) => {
  const el =
    document.head.querySelector(`meta[name="${name}"]`) ||
    document.head.querySelector(`meta[property="${name}"]`)

  if (el && !/viewport/.test(name)) el.remove()
  if (!val) return
  let elMeta
  if (el) elMeta = el
  else
    elMeta = (() => {
      const tmpElMeta = document.createElement('meta')
      return tmpElMeta
    })()

  if (elMeta) {
    if (
      /description|keywords|robots|googlebot|google-site-verification|viewport|twitter:|author|geo.|ICBM/.test(
        name
      )
    )
      elMeta.setAttribute('name', name)
    else elMeta.setAttribute('property', name)

    document.head.insertBefore(elMeta, seoHelperComment)
  } else return

  elMeta.setAttribute('content', val)
} // generateMetaTag

export const generateLinkTag = (
  rel,
  val,
  options?: {
    lang?: string
    country?: string
  }
) => {
  const el = document.head.querySelector(`link[rel="${rel}"]`)

  if (el) el.remove()
  if (!val) return

  const elLink = (() => {
    const tmpElLink = document.createElement('link')

    tmpElLink.setAttribute('rel', rel)

    if (/alternate/.test(rel)) {
      const lang = options?.lang
      const country = options?.country
      let isoCode = ''
      if (lang) isoCode += lang
      if (country) isoCode += `-${country}`

      if (isoCode) tmpElLink.setAttribute('hreflang', isoCode)
    }

    document.head.insertBefore(tmpElLink, seoHelperComment)

    return tmpElLink
  })()

  if (!elLink) return

  elLink.setAttribute('href', val)
} // generateLinkTag
