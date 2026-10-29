// Run on the actual Pokémon page through a browser evaluation tool:
// return import('/scripts/browser/pokemon-gestures.mjs').then(m => m.runPokemonGestureChecks())
// Pointer events exercise Swiper + React; this is not a device FPS benchmark.
// Run this check on a freshly opened name-based Pokémon URL.
export async function runPokemonPrefetchChecks() {
  const { decodeRequestInfo } =
    await import('../../src/utils/ProxyAPIHelper/utils.ts')
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  for (let attempt = 0; attempt < 50; attempt++) {
    if (document.querySelector('.swiper')?.swiper) break
    await wait(100)
  }
  await wait(900)
  const swiper = document.querySelector('.swiper').swiper
  const initialId = swiper.activeIndex + 1
  const detailRequests = () =>
    performance
      .getEntriesByType('resource')
      .filter(
        (entry) =>
          entry.initiatorType === 'fetch' &&
          new URL(entry.name).pathname === '/api'
      )
      .map(
        (entry) =>
          decodeRequestInfo(
            new URL(entry.name).searchParams
              .get('requestInfo')
              .replace(/ /g, '+')
          ).endpoint
      )
      .filter((endpoint) => /^\/pokemon\/[^/?]+$/.test(endpoint))
  const initial = detailRequests()
  const neighbors = initial.filter((endpoint) =>
    /^\/pokemon\/\d+$/.test(endpoint)
  )
  if (neighbors.length > 2)
    throw new Error(
      `Prefetched ${neighbors.length} Pokémon details instead of at most two`
    )
  swiper.slideTo(swiper.activeIndex + 1, 0)
  await wait(1000)
  const after = detailRequests()
  if (after.includes(`/pokemon/${initialId}`))
    throw new Error(
      'Initial Pokémon was fetched twice under name and numeric keys'
    )
  return {
    initialId,
    initialDetailRequests: initial,
    afterOneStep: after,
    duplicateInitialRequest: false,
  }
}

export async function runPokemonGestureChecks() {
  const { decodeRequestInfo } =
    await import('../../src/utils/ProxyAPIHelper/utils.ts')
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const frame = () => new Promise(requestAnimationFrame)
  const assert = (condition, message) => {
    if (!condition) throw new Error(message)
  }
  for (let attempt = 0; attempt < 50; attempt++) {
    if (document.querySelector('.swiper')?.swiper) break
    await wait(100)
  }
  const swiper = document.querySelector('.swiper')?.swiper
  assert(swiper, 'Pokémon carousel is not mounted')
  const bounds = swiper.el.getBoundingClientRect()
  const x = bounds.left + bounds.width * 0.75
  const y = bounds.top + 80
  const pointer = (type, clientX, id, isPrimary = true) => {
    swiper.wrapperEl.dispatchEvent(
      new PointerEvent(type, {
        pointerId: id,
        pointerType: 'touch',
        isPrimary,
        clientX,
        clientY: y,
        button: 0,
        buttons: type === 'pointerup' ? 0 : 1,
        bubbles: true,
        cancelable: true,
      })
    )
  }
  const center = bounds.left + bounds.width / 2
  const errors = []
  const gaps = []
  let held = false
  let computedReads = 0
  let gridUpdates = 0
  let apiRequestsDuringDrag = 0
  const originalFetch = window.fetch
  window.fetch = function (input, init) {
    const url = new URL(
      typeof input === 'string' || input instanceof URL ? input : input.url,
      location.href
    )
    if (held && url.pathname === '/api') {
      const token = url.searchParams.get('requestInfo')
      const endpoint =
        token && decodeRequestInfo(token.replace(/ /g, '+')).endpoint
      if (endpoint && /^\/pokemon\/[^/?]+\/?$/.test(endpoint))
        apiRequestsDuringDrag++
    }
    return originalFetch.call(this, input, init)
  }
  const getTranslate = swiper.getTranslate
  const onGrid = () => {
    if (held) gridUpdates++
  }
  swiper.getTranslate = function (...args) {
    if (held) computedReads++
    return getTranslate.apply(this, args)
  }
  swiper.on('slidesUpdated', onGrid)

  try {
    swiper.slideTo(100, 0)
    await wait(300)
    const directions = [1, 1, -1, 1, -1]
    for (let gesture = 0; gesture < directions.length; gesture++) {
      const id = 700 + gesture
      pointer('pointerdown', x, id)
      const origin = swiper.translate
      const radius = swiper.params.virtual.addSlidesBefore
      held = true
      let previous = performance.now()
      for (let step = 1; step <= 24; step++) {
        await frame()
        const now = performance.now()
        gaps.push(now - previous)
        previous = now
        const distance = directions[gesture] * step * 6
        pointer('pointermove', x - distance, id)
        if (gesture === 0 && step === 4) {
          pointer('pointerdown', x + 20, 800, false)
          pointer('pointerup', x + 20, 800, false)
        }
        if (gesture === 0)
          assert(
            swiper.params.virtual.addSlidesBefore === radius,
            'A secondary finger release rebuilt the primary held gesture window'
          )
        errors.push(Math.abs(swiper.translate - (origin - distance)))
        assert(
          swiper.wrapperEl.style.transitionDuration === '0ms',
          'A CSS snap is competing with a held drag'
        )
      }
      held = false
      pointer('pointerup', x - directions[gesture] * 144, id)
      // Start the next gesture before the previous inertia has finished.
      await wait(70)
    }
    await wait(1800)

    // Reverse direction twice without ever lifting the same finger.
    pointer('pointerdown', x, 850)
    const origin = swiper.translate
    held = true
    const sweep = [
      ...Array.from({ length: 40 }, (_, i) => i + 1),
      ...Array.from({ length: 60 }, (_, i) => 39 - i),
      ...Array.from({ length: 20 }, (_, i) => i - 19),
    ]
    let previous = performance.now()
    for (const step of sweep) {
      await frame()
      const now = performance.now()
      gaps.push(now - previous)
      previous = now
      pointer('pointermove', x - step * 6, 850)
      errors.push(Math.abs(swiper.translate - (origin - step * 6)))
    }
    held = false
    pointer('pointerup', x, 850)
    await wait(800)
    assert(
      Math.max(...errors) < 0.1,
      `Finger tracking error: ${Math.max(...errors).toFixed(2)}px`
    )
    assert(
      computedReads <= 15,
      `Held gestures forced ${computedReads} computed-transform reads`
    )
    assert(
      apiRequestsDuringDrag === 0,
      `Started ${apiRequestsDuringDrag} speculative API requests during held drags`
    )

    // Catch momentum after a previous drag, then release without moving.
    // Swiper retains touches.diff from that previous gesture.
    swiper.params.freeMode.momentum = true
    swiper.slideTo(swiper.activeIndex + 6, 600)
    await wait(80)
    pointer('pointerdown', center, 900)
    const frozen = swiper.translate
    let drift = 0
    for (let step = 0; step < 10; step++) {
      await frame()
      drift = Math.max(drift, Math.abs(swiper.getTranslate() - frozen))
    }
    assert(drift < 0.1, `Touched slide kept drifting: ${drift.toFixed(2)}px`)
    pointer('pointerup', center, 900)
    await wait(800)
    const centerError = Math.abs(
      swiper.translate + swiper.slidesGrid[swiper.activeIndex]
    )
    assert(
      centerError < 0.1,
      `Released hold left an off-center slide: ${centerError.toFixed(2)}px`
    )
    assert(!swiper.animating, 'Animation flag is stuck after chained gestures')

    // Input queued ahead of timers must take control before an earlier tap's
    // deferred centering/navigation callback is allowed to run.
    for (const priorTapX of [center, x]) {
      swiper.slideTo(swiper.activeIndex + 6, 600)
      await wait(80)
      pointer('pointerdown', priorTapX, 920)
      pointer('pointerup', priorTapX, 920)
      pointer('pointerdown', center, 921)
      const caught = swiper.translate
      for (let step = 0; step < 10; step++) {
        await frame()
        assert(
          Math.abs(swiper.getTranslate() - caught) < 0.1,
          'An old tap/centering callback moved the next held gesture'
        )
        assert(
          swiper.wrapperEl.style.transitionDuration === '0ms',
          'An old tap/centering callback started an animation during a hold'
        )
      }
      pointer('pointerup', center, 921)
      await wait(800)
    }

    const start = swiper.activeIndex
    for (let tap = 0; tap < 10; tap++) {
      pointer('pointerdown', x, 950 + tap)
      pointer('pointerup', x, 950 + tap)
      await wait(40)
    }
    await wait(1800)
    assert(
      swiper.activeIndex === start + 10,
      `Rapid taps lost steps: ${swiper.activeIndex - start}/10`
    )

    const sorted = gaps.slice().sort((a, b) => a - b)
    return {
      gestures: directions.length + 1,
      directionReversals: 5,
      sampledFrames: gaps.length,
      maxFingerTrackingErrorPx: Math.max(...errors),
      heldComputedTransformReads: computedReads,
      apiRequestsDuringDrag,
      gridUpdatesDuringDrag: gridUpdates,
      touchedMomentumDriftPx: drift,
      releasedHoldCenterErrorPx: centerError,
      rapidTapSteps: swiper.activeIndex - start,
      frameP95Ms: sorted[Math.floor(sorted.length * 0.95)],
      loading: document.querySelector('[aria-busy]')?.getAttribute('aria-busy'),
    }
  } finally {
    held = false
    swiper.getTranslate = getTranslate
    swiper.off('slidesUpdated', onGrid)
    window.fetch = originalFetch
  }
}
