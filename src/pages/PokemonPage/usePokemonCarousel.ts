import pokemonApi from 'app/apis/pokemon'
import store from 'app/store'
import {
  useEffect,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { Swiper } from 'swiper'
import {
  createPrefetchQueue,
  createCarouselActivity,
  getClickMotion,
  getLookAhead,
  getPokemonImage,
  getPokemonFallbackImage,
  getPrefetchIds,
  getDetailPrefetchIds,
  getSwipeMotion,
  getReleaseMotion,
  interruptCarouselMotion,
} from './navigation.mjs'

export default function usePokemonCarousel(
  id: number,
  select: Dispatch<SetStateAction<number>>,
  detailReady: boolean
) {
  const swiper = useRef<Swiper | null>(null)
  const clickTimers = useRef(new Set<number>())
  const pendingTaps = useRef<{ x: number; time: number }[]>([])
  const tapFlushTimer = useRef<number | null>(null)
  const gesture = useRef(0)
  const pointer = useRef<{
    x: number
    y: number
    time: number
    id: number
    moved: boolean
  } | null>(null)
  const queues = useRef<ReturnType<typeof createPrefetchQueue>[]>([])
  const detailQueue = useRef<ReturnType<typeof createPrefetchQueue> | null>(
    null
  )
  const selectedDetailQueue = useRef<ReturnType<
    typeof createPrefetchQueue
  > | null>(null)
  const selectedDetailTimer = useRef<number | null>(null)
  const selectedDetailId = useRef(0)
  const synchronizing = useRef(false)
  const touching = useRef(false)
  const pendingPrefetch = useRef<number | null>(null)
  const latestPrefetch = useRef<number[]>([])
  const intent = useRef({ direction: 1, rate: 0 })
  const click = useRef({ time: 0, direction: 0, target: 0, rate: 0 })
  const drag = useRef({
    time: 0,
    x: 0,
    velocity: 0,
    rate: 0,
    moved: false,
    direction: 1,
    prefetchTime: 0,
  })
  const [reducedMotion, setReducedMotion] = useState(false)
  const [renderAhead, setRenderAhead] = useState(10)
  const [isNavigating, setIsNavigating] = useState(false)
  const activity = useRef<ReturnType<typeof createCarouselActivity> | null>(
    null
  )

  const synchronizeSelection = useCallback(
    (instance: Swiper | null) => {
      if (
        !instance ||
        instance.destroyed ||
        !id ||
        !instance.width ||
        touching.current ||
        instance.animating ||
        isNavigating ||
        instance.activeIndex === id - 1
      )
        return
      synchronizing.current = true
      selectedDetailId.current = id
      try {
        instance.slideTo(id - 1, 0, false)
      } finally {
        synchronizing.current = false
      }
    },
    [id, isNavigating]
  )

  useLayoutEffect(() => {
    synchronizeSelection(swiper.current)
  }, [synchronizeSelection])

  const requestSelectedDetail = (pokemonId: number) => {
    selectedDetailId.current = pokemonId
    if (selectedDetailTimer.current !== null) return
    // Coalesce rapid retargets without putting Redux work in the pointer event.
    selectedDetailTimer.current = window.setTimeout(() => {
      selectedDetailTimer.current = null
      if (!touching.current)
        selectedDetailQueue.current?.replace([selectedDetailId.current])
    }, 35)
  }

  useEffect(() => {
    const controller = createCarouselActivity({
      onBusy: (busy) => {
        if (busy) detailQueue.current?.replace([])
        setIsNavigating(busy)
      },
      onSettle: () => {
        const instance = swiper.current
        if (!instance || instance.destroyed) return
        select(instance.activeIndex + 1)
        setRenderAhead(10)
        intent.current.rate = 0
      },
      isAnimating: () =>
        Boolean(swiper.current?.animating) || clickTimers.current.size > 0,
    })
    activity.current = controller
    return () => {
      controller.stop()
      activity.current = null
    }
  }, [select])

  useLayoutEffect(() => {
    const instance = swiper.current
    if (!instance || instance.destroyed) return
    const virtual = instance.params.virtual
    // Swiper React does not watch changes to the virtual prop in this version.
    if (virtual && typeof virtual === 'object') {
      virtual.addSlidesBefore = renderAhead
      virtual.addSlidesAfter = renderAhead
      instance.virtual.update(false)
    }
  }, [renderAhead])

  const prefetch = (pokemonId: number, direction = 1, rate = 0) => {
    intent.current = { direction, rate }
    const ahead = getLookAhead(rate)
    // Keep the entire animation path mounted, including when another click
    // interrupts it. Shrink only once the transition has finished.
    // Changing the virtual radius forces React/Swiper to rebuild the slide
    // grid. Keep that work out of a held drag; expand for the release instead.
    if (!touching.current)
      setRenderAhead((previous) => Math.max(previous, ahead))
    latestPrefetch.current = [
      pokemonId,
      ...getPrefetchIds(pokemonId, direction, ahead),
    ]
    if (pendingPrefetch.current !== null) return
    const flush = () => {
      pendingPrefetch.current = null
      queues.current.forEach((queue) => queue.replace(latestPrefetch.current))
    }
    // Redux dispatch/image setup must not delay the same event that positions
    // the slide under the finger. Coalesce changes and use spare frame time.
    pendingPrefetch.current = window.requestIdleCallback
      ? window.requestIdleCallback(flush, { timeout: 120 })
      : window.setTimeout(flush, 16)
  }

  const flushTaps = () => {
    if (tapFlushTimer.current !== null) return
    const timer = window.setTimeout(() => {
      clickTimers.current.delete(timer)
      tapFlushTimer.current = null
      if (touching.current) return
      const instance = swiper.current
      if (!instance || instance.destroyed) return
      const bounds = instance.el.getBoundingClientRect()
      for (const tap of pendingTaps.current.splice(0)) {
        const relativeX = (tap.x - bounds.left) / bounds.width
        if (relativeX < 0 || relativeX > 1) continue
        const direction = relativeX < 1 / 3 ? -1 : relativeX > 2 / 3 ? 1 : 0
        if (!direction) continue
        const motion = getClickMotion(
          click.current,
          direction,
          tap.time,
          instance.activeIndex + 1
        )
        click.current = motion
        if (motion.target === instance.activeIndex + 1 && !instance.animating)
          continue
        activity.current?.start()
        requestSelectedDetail(motion.target)
        prefetch(motion.target, direction, motion.rate)
        instance.slideTo(
          motion.target - 1,
          reducedMotion ? 0 : Math.max(240, 560 / (1 + motion.rate * 0.035))
        )
      }
    }, 0)
    tapFlushTimer.current = timer
    clickTimers.current.add(timer)
  }

  useEffect(() => {
    const timers = clickTimers.current
    const taps = pendingTaps.current
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    update()
    media.addEventListener('change', update)
    const loadDetail = (pokemonId: number) =>
      store
        .dispatch(
          pokemonApi.endpoints[
            import.meta.env.API_ENDPOINT_GET_POKEMON_DETAIL
          ].initiate(pokemonId, { subscribe: false })
        )
        .unwrap()
    const apiQueue = createPrefetchQueue(async (pokemonId) => {
      if (touching.current || swiper.current?.animating)
        throw new Error('Selection is moving')
      await loadDetail(pokemonId)
    }, 1)
    detailQueue.current = apiQueue
    const selectedQueue = createPrefetchQueue(async (pokemonId) => {
      if (touching.current) throw new Error('Selection is held')
      await loadDetail(pokemonId)
    }, 2)
    selectedDetailQueue.current = selectedQueue
    const imageQueue = createPrefetchQueue(
      (pokemonId) =>
        new Promise<void>((resolve, reject) => {
          const image = new window.Image()
          const timeout = window.setTimeout(() => finish(false), 10000)
          const finish = (success: boolean) => {
            window.clearTimeout(timeout)
            image.onload = null
            image.onerror = null
            if (success) resolve()
            else reject(new Error('Image prefetch failed'))
          }
          image.onload = () => finish(true)
          let triedFallback = false
          image.onerror = () => {
            if (triedFallback) return finish(false)
            triedFallback = true
            image.src = getPokemonFallbackImage(pokemonId)
          }
          image.src = getPokemonImage(pokemonId)
        })
    )
    queues.current = [imageQueue]
    return () => {
      if (pendingPrefetch.current !== null) {
        if (window.cancelIdleCallback)
          window.cancelIdleCallback(pendingPrefetch.current)
        else window.clearTimeout(pendingPrefetch.current)
        pendingPrefetch.current = null
      }
      timers.forEach((timer) => window.clearTimeout(timer))
      timers.clear()
      taps.length = 0
      tapFlushTimer.current = null
      swiper.current = null
      queues.current.forEach((queue) => queue.stop())
      queues.current = []
      apiQueue.stop()
      detailQueue.current = null
      selectedQueue.stop()
      selectedDetailQueue.current = null
      if (selectedDetailTimer.current !== null) {
        window.clearTimeout(selectedDetailTimer.current)
        selectedDetailTimer.current = null
      }
      media.removeEventListener('change', update)
    }
  }, [])

  useEffect(() => {
    detailQueue.current?.replace([])
    if (!id || !detailReady || isNavigating) return
    const timer = window.setTimeout(() => {
      if (touching.current || swiper.current?.animating) return
      detailQueue.current?.replace(
        getDetailPrefetchIds(id, intent.current.direction)
      )
    }, 250)
    return () => window.clearTimeout(timer)
  }, [id, detailReady, isNavigating])

  useEffect(() => {
    if (id) prefetch(id, intent.current.direction, intent.current.rate)
  }, [id])

  return {
    reducedMotion,
    renderAhead,
    isNavigating,
    onTransitionEnd() {
      activity.current?.transitionEnd()
    },
    onSlideChange(instance: Swiper) {
      if (swiper.current !== instance || synchronizing.current) return
      const nextId = instance.activeIndex + 1
      activity.current?.start()
      if (!touching.current) requestSelectedDetail(nextId)
      prefetch(
        nextId,
        instance.activeIndex >= instance.previousIndex ? 1 : -1,
        intent.current.rate
      )
    },
    onSwiper(instance: Swiper) {
      swiper.current = instance
      synchronizeSelection(instance)
    },
    onResize: synchronizeSelection,
    onUpdate: synchronizeSelection,
    onPointerDownCapture(event: ReactPointerEvent) {
      if (!event.isPrimary || event.button !== 0) return
      gesture.current++
      touching.current = true
      selectedDetailQueue.current?.replace([])
      activity.current?.touchStart()
      interruptCarouselMotion(swiper.current)
      pointer.current = {
        x: event.clientX,
        y: event.clientY,
        time: performance.now(),
        id: event.pointerId,
        moved: false,
      }
    },
    onPointerMoveCapture(event: ReactPointerEvent) {
      const start = pointer.current
      if (
        start &&
        start.id === event.pointerId &&
        Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8
      )
        start.moved = true
    },
    onPointerCancelCapture(event: ReactPointerEvent) {
      const start = pointer.current
      if (!event.isPrimary || (start && start.id !== event.pointerId)) return
      touching.current = false
      pointer.current = null
      click.current.time = 0
      pendingTaps.current.length = 0
      activity.current?.touchEnd()
    },
    onPointerUpCapture(event: ReactPointerEvent) {
      const start = pointer.current
      if (!event.isPrimary || (start && start.id !== event.pointerId)) return
      touching.current = false
      activity.current?.touchEnd()
      pointer.current = null
      if (
        !start ||
        start.id !== event.pointerId ||
        start.moved ||
        Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8 ||
        performance.now() - start.time > 600
      )
        return
      // Preserve every tap, but never let its deferred animation compete with
      // the next held finger. A deliberate drag supersedes queued tap intent.
      pendingTaps.current.push({ x: event.clientX, time: performance.now() })
      flushTaps()
    },
    onTouchStart(instance: Swiper) {
      touching.current = true
      selectedDetailQueue.current?.replace([])
      activity.current?.touchStart()
      drag.current = {
        time: performance.now(),
        x: instance.touches.currentX,
        velocity: 0,
        rate: 0,
        moved: false,
        direction: 1,
        prefetchTime: 0,
      }
    },
    onSliderMove(instance: Swiper) {
      activity.current?.start()
      if (Math.abs(instance.touches.currentX - instance.touches.startX) > 8) {
        click.current.time = 0
        pendingTaps.current.length = 0
      }
      const now = performance.now()
      const sample = drag.current
      const motion = getSwipeMotion(
        sample,
        instance.touches.currentX,
        now,
        instance.slidesSizesGrid[instance.activeIndex] || instance.width / 3
      )
      drag.current = {
        ...motion,
        moved: sample.moved || Math.abs(instance.touches.diff) > 0,
        prefetchTime: sample.prefetchTime,
      }
      if (
        now - sample.prefetchTime > 90 ||
        motion.direction !== sample.direction
      ) {
        prefetch(instance.activeIndex + 1, motion.direction, motion.rate)
        drag.current.prefetchTime = now
      }
    },
    onTouchEnd(instance: Swiper) {
      touching.current = false
      requestSelectedDetail(instance.activeIndex + 1)
      activity.current?.touchEnd()
      if (pendingTaps.current.length) flushTaps()
      const sample = drag.current
      const motion = getReleaseMotion(
        sample,
        performance.now(),
        instance.slidesSizesGrid[instance.activeIndex] || instance.width / 3
      )
      const options = instance.params.freeMode
      // Crossing Swiper's drag threshold can emit sliderMove without actually
      // translating. Such a gesture has no transitionEnd to restore the buffer.
      const moved = sample.moved && Boolean(instance.touches.diff)
      if (!moved) {
        const releasedGesture = gesture.current
        // A tap/hold that only caught momentum still needs a final centered
        // position. Let any queued next/prev tap take precedence first.
        const timer = window.setTimeout(() => {
          clickTimers.current.delete(timer)
          if (
            instance.destroyed ||
            instance.animating ||
            touching.current ||
            releasedGesture !== gesture.current ||
            pendingTaps.current.length ||
            clickTimers.current.size
          )
            return
          instance.slideToClosest(reducedMotion ? 0 : 220)
        }, 0)
        clickTimers.current.add(timer)
      }
      if (typeof options === 'object') {
        options.momentum = moved && !reducedMotion && motion.momentum
        options.momentumRatio = motion.momentumRatio
        options.momentumVelocityRatio = motion.momentumVelocityRatio
      }
      if (!moved) setRenderAhead(10)
      prefetch(
        instance.activeIndex + 1,
        sample.direction,
        moved ? motion.rate : 0
      )
    },
  }
}
