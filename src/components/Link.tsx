import { Link as ReactLinkNative } from 'react-router'

function LinkCustom(props: any) {
  const { children, ...linkProps } = props

  const onClick = (ev) => {
    linkProps.onClick?.(ev)
    const anchor = ev.currentTarget
    if (
      anchor.pathname === location.pathname &&
      anchor.search === location.search &&
      anchor.hash === location.hash
    ) {
      ev.preventDefault()
      return
    }
    return true
  }

  return (
    <ReactLinkNative {...linkProps} onClick={onClick}>
      {children}
    </ReactLinkNative>
  )
}

export default LinkCustom
