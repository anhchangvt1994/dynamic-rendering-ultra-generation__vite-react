// Prepares the "ink reveal" page transition: the next page grows out of the
// tapped point as an ink circle (styles in main.css, html[data-ink]). Used
// with react-router's viewTransition; without View Transitions support, or
// with reduced motion, it does nothing and navigation is a normal cut.
export function prepareInkReveal(event: { clientX: number; clientY: number }) {
  const root = document.documentElement
  const supported = 'startViewTransition' in document
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!supported || reduced) return false
  // keyboard activation reports 0,0: grow from the screen centre instead
  const x = event.clientX || innerWidth / 2
  const y = event.clientY || innerHeight / 2
  root.style.setProperty('--ink-x', `${x}px`)
  root.style.setProperty('--ink-y', `${y}px`)
  root.dataset.ink = 'true'
  // the transition lasts ~600ms; clear the flag so later navigations
  // (Back, menu) keep the default crossfade
  window.setTimeout(() => {
    delete root.dataset.ink
  }, 900)
  return true
}
