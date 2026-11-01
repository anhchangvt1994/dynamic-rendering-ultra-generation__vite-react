/**
 * Shrinks an element's one-line text until it fits `width` px: the width
 * of a text grows with its font size, so one measure gives the size. Never
 * grows past the size the CSS gives it.
 */
export function fitText(element: HTMLElement, width: number) {
  element.style.fontSize = ''
  const style = getComputedStyle(element)
  const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
  const text = element.scrollWidth - padding
  const room = width - padding
  if (text <= room || text <= 0) return
  const size = (parseFloat(style.fontSize) * room) / text
  element.style.fontSize = `${Math.max(9, Math.floor(size * 10) / 10)}px`
}
