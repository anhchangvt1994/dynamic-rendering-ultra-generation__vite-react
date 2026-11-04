/** Compare viewport coordinates; offsetTop may belong to a different ancestor. */
export function isItemNameStuck(scroll, name, barHeight) {
  if (
    scroll.scrollTop <= 0 ||
    scroll.clientHeight <= 0 ||
    scroll.scrollHeight <= scroll.clientHeight
  )
    return false
  const rect = scroll.getBoundingClientRect()
  if (rect.height <= 0 || scroll.offsetHeight <= 0) return false
  const scale = rect.height / scroll.offsetHeight
  const top = rect.top + scroll.clientTop * scale
  return name.getBoundingClientRect().top <= top + barHeight * scale
}
