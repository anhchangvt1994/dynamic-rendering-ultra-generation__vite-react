// Open /pokemon/perrserker. Exercise the same keyboard handler as the user.
async function checkDetailPanels() {
  if (location.pathname !== '/pokemon/perrserker')
    throw new Error('Open Perrserker first')
  document.querySelector('main').scrollTop = 0
  const checks = []
  for (const [direction, name] of [
    [1, 'cursola'],
    [1, 'sirfetchd'],
    [-1, 'cursola'],
    [-1, 'perrserker'],
    [1, 'cursola'],
  ]) {
    const code = direction === 1 ? 39 : 37
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: direction === 1 ? 'ArrowRight' : 'ArrowLeft',
        keyCode: code,
        which: code,
        bubbles: true,
      })
    )
    const deadline = performance.now() + 10000
    while (
      location.pathname !== `/pokemon/${name}` ||
      document
        .querySelector('.pokemon-page [aria-busy]')
        ?.getAttribute('aria-busy') !== 'false'
    ) {
      if (performance.now() > deadline)
        throw new Error(`Navigation did not settle on ${name}`)
      await new Promise(requestAnimationFrame)
    }
    await new Promise(requestAnimationFrame)
    const charts = document.querySelectorAll(
      '[aria-label="Điểm yếu và kháng hệ"]'
    ).length
    const moves = document.querySelectorAll(
      '[aria-label="Bộ chiêu thức"]'
    ).length
    if (charts !== 1 || moves !== 1)
      throw new Error(
        `${name}: expected one chart and moveset; got ${charts}/${moves}`
      )
    checks.push({ name, charts, moves })
  }
  return { passed: true, checks }
}
