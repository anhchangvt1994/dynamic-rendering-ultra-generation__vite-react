// Browser regression: open the generation select with Galar & Hisui selected.
// Evaluate this function in the page. It exercises the actual Radix viewport.
async function checkSelectScroll() {
  const viewport = document.querySelector('[data-radix-select-viewport]')
  const popup = document.querySelector('[role="listbox"]')
  if (!viewport || !popup) throw new Error('Open the generation menu first')
  const frames = async () => {
    for (let count = 0; count < 5; count++)
      await new Promise(requestAnimationFrame)
  }
  viewport.scrollTop = 0
  await frames()
  const height = viewport.clientHeight
  const popupHeight = popup.clientHeight
  viewport.scrollTop = 10
  await frames()
  if (Math.abs(viewport.scrollTop - 10) > 1)
    throw new Error(
      `Scroll jumped: requested 10px, got ${viewport.scrollTop}px`
    )
  if (viewport.clientHeight !== height || popup.clientHeight !== popupHeight)
    throw new Error('Menu geometry changed during scrolling')
  const samples = []
  for (const target of [50, 100, 160, 80, 20, 0]) {
    const bounded = Math.min(
      target,
      viewport.scrollHeight - viewport.clientHeight
    )
    viewport.scrollTop = bounded
    await frames()
    if (
      Math.abs(viewport.scrollTop - bounded) > 1 ||
      viewport.clientHeight !== height
    )
      throw new Error(`Scroll was interrupted at ${target}px`)
    samples.push(viewport.scrollTop)
  }
  return { passed: true, viewportHeight: height, popupHeight, samples }
}
