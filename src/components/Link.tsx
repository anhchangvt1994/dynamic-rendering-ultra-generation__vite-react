import type { LinkProps } from 'react-router'
import { Link as ReactLinkNative } from 'react-router'

interface IProps extends LinkProps {}

function LinkCustom(props: IProps) {
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
