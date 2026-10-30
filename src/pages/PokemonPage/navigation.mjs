// National Pokédex supported by this Gen 9 page; exclude alternate-form IDs.
export const POKEMON_COUNT = 1025
// Stage artwork comes from PokéAPI: it serves CORS, so the same file also
// feeds the CSS-mask power effects (one download instead of two).
export const getPokemonImage = (id) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`

// Second source when the PokéAPI image fails (same art, other host).
export const getPokemonAltImage = (id) =>
  `https://www.pokemon.com/static-assets/content-assets/cms2/img/pokedex/full/${String(id).padStart(3, '0')}.png`

// 96px pixel sprite (~1–3 KB) for lists; exists for every species and form.
export const getPokemonSprite = (id) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`

/**
 * Image sources for a form, best first. A few recent forms (Koraidon's and
 * Miraidon's ride builds) have no art or sprite anywhere on PokéAPI, so the
 * last resort is the default form's art: the same Pokémon, never a hole.
 * `small` puts the 2 KB sprite first, for chips and lists.
 */
export const getFormImages = (id, baseId, { small = false } = {}) => {
  const own = small
    ? [getPokemonSprite(id), getPokemonImage(id)]
    : [getPokemonImage(id), getPokemonSprite(id)]
  const base = baseId && baseId !== id ? [getPokemonImage(baseId)] : []
  return [...own, ...base]
}

/** onError: moves an <img> to the next source; false once none is left. */
export function showNextImage(image, sources) {
  const step = Number(image.dataset.step || 0) + 1
  if (step >= sources.length) return false
  image.dataset.step = String(step)
  image.src = sources[step]
  return true
}

export const getPokemonFallbackImage = (id) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`

// At rest only the next few neighbours are prefetched (they are mostly seen
// as silhouettes); fast swipes widen the window up to 40.
export const getLookAhead = (slidesPerSecond) =>
  Math.min(40, 4 + Math.ceil(Math.max(0, slidesPerSecond) * 1.5))

// Neighbor payloads include the full moveset. Their speculative window stays
// small and waits until settling; the selected target loads during animation.
export const getDetailPrefetchIds = (id, direction = 1) =>
  [id + (direction || 1), id - (direction || 1)].filter(
    (neighbor) => neighbor >= 1 && neighbor <= POKEMON_COUNT
  )

// Catch an in-flight slide exactly where it is painted. FreeMode.onTouchStart
// otherwise starts a second sticky snap, which fights the next finger drag.
export function interruptCarouselMotion(swiper) {
  if (!swiper || swiper.destroyed) return
  swiper.velocity = 0
  swiper.touchEventsData.velocities.length = 0
  if (!swiper.animating) return
  const position = swiper.getTranslate()
  swiper.setTransition(0)
  swiper.setTranslate(position)
  // Drain the previous CSS completion listener so it cannot finish a later
  // gesture. This is also how Swiper interrupts transitions on first move.
  swiper.wrapperEl.dispatchEvent(new Event('transitionend'))
  if (swiper.animating) swiper.transitionEnd(false)
  swiper.updateActiveIndex()
  swiper.updateSlidesClasses()
}

// A Gaussian crest has no seam at the active-slide boundary and zero slope
// at the center: neighboring images grow and recede as one continuous wave.
export function getWaveVisual(progress) {
  const focus = Math.exp(-1.45 * progress * progress)
  return {
    scale: 0.58 + 0.46 * focus,
    y: 8 - 18 * focus,
    opacity: 0.28 + 0.72 * focus,
    blur: 0.7 * (1 - focus),
  }
}

// Keep cached details hidden throughout interrupted transitions and held drags.
// Only the final resting selection is committed to React/the URL.
export function createCarouselActivity({
  onBusy,
  onSettle,
  isAnimating,
  schedule = setTimeout,
  cancel = clearTimeout,
}) {
  let timer
  let touching = false
  let busy = false
  let stopped = false
  const clear = () => {
    if (timer !== undefined) cancel(timer)
    timer = undefined
  }
  const settle = (delay = 60) => {
    clear()
    if (!busy || stopped) return
    timer = schedule(() => {
      timer = undefined
      if (touching || isAnimating()) return settle()
      busy = false
      onSettle()
      onBusy(false)
    }, delay)
  }
  return {
    start() {
      if (stopped) return
      clear()
      if (!busy) {
        busy = true
        onBusy(true)
      }
      settle()
    },
    touchStart() {
      touching = true
      clear()
    },
    touchEnd() {
      touching = false
      settle()
    },
    transitionEnd: () => settle(32),
    stop() {
      stopped = true
      clear()
    },
  }
}

// Smooth event jitter without carrying velocity across a direction reversal.
// Rate is in slides/second so the same gesture works on mobile and desktop.
export function getSwipeMotion(previous, x, time, slideWidth) {
  const elapsed = Math.max(1, time - previous.time)
  const instantaneous = (previous.x - x) / elapsed
  const direction = Math.sign(instantaneous) || previous.direction
  const continuing = direction === previous.direction && elapsed < 150
  const velocity = continuing
    ? previous.velocity * 0.35 + instantaneous * 0.65
    : instantaneous
  const acceleration = continuing
    ? Math.max(0, Math.abs(velocity) - Math.abs(previous.velocity)) / elapsed
    : 0
  return {
    x,
    time,
    direction,
    velocity,
    instantaneous,
    rate:
      ((Math.abs(velocity) + acceleration * 40) * 1000) /
      Math.max(1, slideWidth),
  }
}

export function getReleaseMotion(sample, time, slideWidth) {
  const momentum = time - sample.time < 150 && Math.abs(sample.velocity) > 0.04
  const rate = momentum ? sample.rate : 0
  const momentumVelocityRatio = 0.8 + Math.min(rate / 50, 0.4)
  // Swiper halves the measured velocity. Bound a flick to 30 slides so its
  // entire path fits inside the maximum prefetched/rendered horizon.
  const slidesPerMs =
    (Math.abs(sample.instantaneous ?? sample.velocity) *
      0.5 *
      momentumVelocityRatio) /
    Math.max(1, slideWidth)
  const momentumRatio = Math.min(
    0.45 + Math.min(rate / 30, 0.55),
    slidesPerMs ? 30 / (slidesPerMs * 1000) : 1
  )
  return {
    momentum,
    rate,
    momentumRatio,
    momentumVelocityRatio,
    distance: momentum
      ? Math.min(30, Math.ceil(slidesPerMs * momentumRatio * 1000))
      : 0,
  }
}

export function getClickMotion(previous, direction, time, currentId) {
  const elapsed = time - previous.time
  const burst = previous.time > 0 && elapsed < 600
  const rate =
    burst && previous.direction === direction ? 1000 / Math.max(40, elapsed) : 0
  return {
    time,
    direction,
    rate,
    target: Math.max(
      1,
      Math.min(POKEMON_COUNT, (burst ? previous.target : currentId) + direction)
    ),
  }
}

export function getPrefetchIds(id, direction, ahead, max = POKEMON_COUNT) {
  const ids = []
  for (let distance = 1; distance <= ahead; distance++) {
    ids.push(id + distance * (direction || 1))
  }
  // behind the reader: as far as the look-ahead, never more than 10
  for (let distance = 1; distance <= Math.min(10, ahead); distance++) {
    ids.push(id - distance * (direction || 1))
  }
  return [...new Set(ids)].filter(
    (item) => item >= 1 && item <= max && item !== id
  )
}

// Replacing pending work makes reversal responsive. In-flight requests finish
// into the cache, and failures remain retryable on the next interaction.
export function createPrefetchQueue(load, concurrency = 4) {
  let pending = []
  let stopped = false
  const active = new Set()
  const recent = new Map()
  function pump() {
    while (!stopped && active.size < concurrency && pending.length) {
      const id = pending.shift()
      if (active.has(id) || Date.now() - (recent.get(id) || 0) < 240000)
        continue
      active.add(id)
      let result
      try {
        result = load(id)
      } catch (error) {
        result = Promise.reject(error)
      }
      Promise.resolve(result)
        .then(() => {
          recent.delete(id)
          recent.set(id, Date.now())
          if (recent.size > 160) recent.delete(recent.keys().next().value)
        })
        .catch(() => {})
        .finally(() => {
          active.delete(id)
          pump()
        })
    }
  }
  return {
    replace(ids) {
      pending = [...new Set(ids)]
      pump()
    },
    stop() {
      stopped = true
      pending = []
    },
  }
}
