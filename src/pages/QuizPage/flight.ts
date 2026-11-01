/**
 * The won gift flies from the fuse to its card: a copy of the sprite arcs
 * over the page, grows and lands. Skipped when either end is off screen
 * (the card then simply lands on its own).
 */
export function flyTo(
  from: Element | null | undefined,
  to: Element | null | undefined,
  src: string,
  glow: string
) {
  if (!from || !to || typeof document === 'undefined') return
  const a = from.getBoundingClientRect()
  const b = to.getBoundingClientRect()
  const visible = (box: DOMRect) =>
    box.width > 0 && box.bottom > 0 && box.top < window.innerHeight
  if (!visible(a) || !visible(b) || !('animate' in Element.prototype)) return

  const img = document.createElement('img')
  img.src = src
  img.alt = ''
  img.setAttribute('aria-hidden', 'true')
  Object.assign(img.style, {
    position: 'fixed',
    left: `${a.left}px`,
    top: `${a.top}px`,
    width: `${a.width}px`,
    height: `${a.height}px`,
    zIndex: '2147483000',
    pointerEvents: 'none',
    imageRendering: 'pixelated',
    filter: `drop-shadow(0 0 10px ${glow}) drop-shadow(0 0 3px #fff)`,
  })
  document.body.append(img)
  const dx = b.left + b.width / 2 - (a.left + a.width / 2)
  const dy = b.top + b.height / 2 - (a.top + a.height / 2)
  const scale = b.width / a.width
  const animation = img.animate(
    [
      { transform: 'translate(0, 0) scale(1) rotate(0deg)' },
      {
        transform: `translate(${dx * 0.3}px, ${Math.min(dy, 0) * 0.3 - 90}px) scale(${Math.max(scale, 1) * 1.6}) rotate(-24deg)`,
        offset: 0.42,
      },
      {
        transform: `translate(${dx}px, ${dy}px) scale(${scale}) rotate(0deg)`,
        opacity: 0.2,
      },
    ],
    {
      duration: 760,
      easing: 'cubic-bezier(0.45, 0, 0.25, 1)',
      fill: 'forwards',
    }
  )
  const done = () => img.remove()
  animation.onfinish = done
  animation.oncancel = done
  window.setTimeout(done, 1400)
}
