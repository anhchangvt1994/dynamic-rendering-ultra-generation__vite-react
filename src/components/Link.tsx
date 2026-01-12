import { Link as ReactLinkNative } from 'react-router'

function LinkCustom(props: any) {
  const { children, ...linkProps } = props

  const onClick = (ev) => {
    if (ev.target.pathname === location.pathname) {
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
