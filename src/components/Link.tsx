import { Link as ReactLinkNative } from 'react-router-dom'
import type { LinkProps } from 'react-router-dom'

interface IProps extends LinkProps {}

function Link(props: IProps) {
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

export default Link
