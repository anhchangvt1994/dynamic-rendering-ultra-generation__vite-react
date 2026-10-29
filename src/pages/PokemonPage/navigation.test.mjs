import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  getClickMotion,
  getLookAhead,
  getPrefetchIds,
  createPrefetchQueue,
} from './navigation.mjs'
import * as navigation from './navigation.mjs'
import Swiper from 'swiper'
import { FreeMode } from 'swiper/modules'

test('detail speculation stays at two adjacent Pokémon, in travel order', () => {
  assert.deepEqual(navigation.getDetailPrefetchIds(25, 1), [26, 24])
  assert.deepEqual(navigation.getDetailPrefetchIds(25, -1), [24, 26])
  assert.deepEqual(navigation.getDetailPrefetchIds(1, -1), [2])
  assert.deepEqual(navigation.getDetailPrefetchIds(1025, 1), [1024])
})

test('a new resting gesture clears old velocity without reading computed layout', () => {
  const swiper = new Swiper({ init: false, modules: [FreeMode] })
  swiper.translate = -150
  swiper.animating = false
  swiper.velocity = 3
  swiper.touchEventsData.velocities.push({ position: 30, time: 1000 })
  swiper.getTranslate = () => {
    throw new Error('unnecessary computed-style read')
  }
  navigation.interruptCarouselMotion(swiper)
  assert.equal(swiper.translate, -150)
  assert.equal(swiper.velocity, 0)
  assert.equal(swiper.touchEventsData.velocities.length, 0)
})

test('touching momentum freezes the painted position without starting another snap', () => {
  const swiper = new Swiper({ init: false, modules: [FreeMode] })
  const wrapper = new EventTarget()
  wrapper.style = {}
  swiper.wrapperEl = wrapper
  swiper.snapGrid = [-100, 0, 100, 200, 300]
  swiper.translate = -300
  swiper.animating = true
  swiper.getTranslate = () => -137.25
  swiper.touchEventsData.velocities.push({ position: 42, time: 1000 })
  // Model the actual one-shot CSS completion listener installed by Swiper.
  wrapper.addEventListener('transitionend', () => swiper.transitionEnd(), {
    once: true,
  })
  let snaps = 0
  swiper.slideToClosest = () => {
    snaps++
  }

  navigation.interruptCarouselMotion(swiper)

  assert.equal(swiper.translate, -137.25)
  assert.equal(wrapper.style.transitionDuration, '0ms')
  assert.equal(swiper.animating, false)
  assert.equal(swiper.touchEventsData.velocities.length, 0)
  assert.equal(snaps, 0)
})

test('wave zoom follows position continuously and is symmetric around the center', () => {
  const center = navigation.getWaveVisual(0)
  const side = navigation.getWaveVisual(1)
  assert.ok(center.scale > side.scale)
  assert.ok(center.opacity > side.opacity)
  assert.ok(center.y < side.y)
  assert.deepEqual(
    navigation.getWaveVisual(-0.75),
    navigation.getWaveVisual(0.75)
  )
  // Crossing the active-slide boundary must not cause a zoom/blur step.
  const before = navigation.getWaveVisual(0.499)
  const after = navigation.getWaveVisual(0.501)
  assert.ok(Math.abs(before.scale - after.scale) < 0.003)
  assert.ok(Math.abs(before.blur - after.blur) < 0.003)
  for (const progress of [-100, -2, 0, 2, 100]) {
    const visual = navigation.getWaveVisual(progress)
    assert.ok(visual.scale >= 0.58 && visual.scale <= 1.04)
    assert.ok(visual.opacity >= 0 && visual.opacity <= 1)
  }
})

function createActivityHarness() {
  let now = 0
  let nextTimer = 0
  let animating = false
  const timers = new Map()
  const events = []
  const activity = navigation.createCarouselActivity({
    onBusy: (busy) => events.push(busy ? 'busy' : 'ready'),
    onSettle: () => events.push('commit'),
    isAnimating: () => animating,
    schedule: (callback, delay) => {
      const timer = ++nextTimer
      timers.set(timer, { callback, time: now + delay })
      return timer
    },
    cancel: (timer) => timers.delete(timer),
  })
  return {
    activity,
    events,
    animate: (value) => {
      animating = value
    },
    advance(duration) {
      now += duration
      for (const [timer, task] of [...timers]) {
        if (task.time <= now) {
          timers.delete(timer)
          task.callback()
        }
      }
    },
  }
}

test('rapid navigation keeps one scanning state and commits only after motion settles', () => {
  const { activity, events, advance, animate } = createActivityHarness()
  activity.start()
  animate(true)
  advance(500)
  activity.start()
  activity.transitionEnd()
  advance(200)
  assert.deepEqual(events, ['busy'])
  animate(false)
  activity.transitionEnd()
  advance(200)
  assert.deepEqual(events, ['busy', 'commit', 'ready'])
})

test('cached details are revealed within two frames of a completed transition', () => {
  const { activity, events, advance, animate } = createActivityHarness()
  activity.start()
  animate(true)
  advance(500)
  assert.deepEqual(events, ['busy'])
  animate(false)
  activity.transitionEnd()
  advance(32)
  assert.deepEqual(events, ['busy', 'commit', 'ready'])
})

test('an interrupted transition cannot reveal details while a new drag is held', () => {
  const { activity, events, advance } = createActivityHarness()
  activity.start()
  activity.touchStart()
  activity.transitionEnd()
  advance(1000)
  assert.deepEqual(events, ['busy'])
  activity.touchEnd()
  advance(200)
  assert.deepEqual(events, ['busy', 'commit', 'ready'])
})

test('a simple tap does not start scanning and disposal cancels pending commits', () => {
  const { activity, events, advance } = createActivityHarness()
  activity.touchStart()
  activity.touchEnd()
  advance(200)
  assert.deepEqual(events, [])
  activity.start()
  activity.stop()
  advance(1000)
  assert.deepEqual(events, ['busy'])
})

test('swipe acceleration expands prefetch and slowing down contracts it', () => {
  const start = { time: 1000, x: 500, velocity: 0, direction: 1 }
  const slow = navigation.getSwipeMotion(start, 490, 1020, 200)
  const fast = navigation.getSwipeMotion(slow, 430, 1040, 200)
  const braking = navigation.getSwipeMotion(fast, 428, 1080, 200)
  assert.ok(fast.rate > slow.rate)
  assert.ok(braking.rate < fast.rate)
  assert.ok(getLookAhead(fast.rate) > getLookAhead(slow.rate))
  const reverse = navigation.getSwipeMotion(fast, 450, 1060, 200)
  assert.equal(reverse.direction, -1)
  assert.ok(reverse.velocity < 0)
})

test('release after a pause discards stale velocity and very fast flicks stay bounded', () => {
  const sample = { time: 1000, velocity: 20, rate: 100, direction: 1 }
  const flick = navigation.getReleaseMotion(sample, 1020, 100)
  const paused = navigation.getReleaseMotion(sample, 1300, 100)
  assert.ok(flick.rate > 0)
  assert.ok(flick.distance <= 30)
  assert.equal(paused.rate, 0)
  assert.equal(paused.distance, 0)
  assert.equal(paused.momentum, false)
})

test('a sudden flick is capped using raw velocity, matching Swiper free mode', () => {
  const sample = navigation.getSwipeMotion(
    { time: 1000, x: 1000, velocity: 0, direction: 1 },
    0,
    1010,
    100
  )
  const release = navigation.getReleaseMotion(sample, 1020, 100)
  // Swiper halves the raw 100px/ms velocity before applying these options.
  const nativeDistance =
    (50 * release.momentumVelocityRatio * 1000 * release.momentumRatio) / 100
  assert.ok(nativeDistance <= 30.001)
})

test('a synchronous prefetch failure releases its slot and remains retryable', async () => {
  const loaded = []
  let fail = true
  const queue = createPrefetchQueue((id) => {
    if (id === 1 && fail) throw new Error('unavailable')
    loaded.push(id)
  }, 1)
  assert.doesNotThrow(() => queue.replace([1, 2]))
  await new Promise(setImmediate)
  assert.deepEqual(loaded, [2])
  fail = false
  queue.replace([1, 2])
  await new Promise(setImmediate)
  assert.deepEqual(loaded, [2, 1])
  queue.stop()
})

test('faster input expands the horizon, with a bounded maximum', () => {
  // at rest only a small neighbourhood is prefetched
  assert.equal(getLookAhead(0), 4)
  assert.ok(getLookAhead(12) > getLookAhead(2))
  assert.equal(getLookAhead(10000), 40)
})

test('prefetch prioritizes travel direction and respects both boundaries', () => {
  assert.deepEqual(getPrefetchIds(3, -1, 2, 5), [2, 1, 4, 5])
  assert.deepEqual(getPrefetchIds(3, 1, 2, 5), [4, 5, 2, 1])
  assert.ok(getPrefetchIds(1, -1, 10, 1025).every((id) => id > 1 && id <= 1025))
  assert.ok(
    getPrefetchIds(1025, 1, 10, 1025).every((id) => id >= 1 && id < 1025)
  )
})

test('queue bounds concurrency, deduplicates and replaces stale pending work', async () => {
  const started = []
  const releases = []
  const queue = createPrefetchQueue((id) => {
    started.push(id)
    return new Promise((resolve) => releases.push(resolve))
  }, 2)
  queue.replace([1, 2, 3, 3, 4])
  assert.deepEqual(started, [1, 2])
  queue.replace([2, 5, 6])
  releases.shift()()
  await new Promise(setImmediate)
  assert.deepEqual(started, [1, 2, 5])
  queue.stop()
  releases.forEach((release) => release())
  await new Promise(setImmediate)
  assert.deepEqual(started, [1, 2, 5])
})

test('failed prefetch can be retried and does not block other work', async () => {
  const started = []
  const queue = createPrefetchQueue(async (id) => {
    started.push(id)
    if (started.length === 1) throw new Error('offline')
  }, 1)
  queue.replace([1, 2])
  await new Promise(setImmediate)
  queue.replace([1, 2])
  await new Promise(setImmediate)
  assert.deepEqual(started, [1, 2, 1])
  queue.stop()
})

// Swiper may reset activeIndex to the visual position when a click interrupts
// momentum. The requested destination must still count every click.
test('rapid clicks accumulate destinations despite an interrupted animation', () => {
  let motion = { time: 0, direction: 0, target: 25 }
  for (let index = 0; index < 10; index++) {
    motion = getClickMotion(motion, 1, 1000 + index * 40, 25)
  }
  assert.equal(motion.target, 35)
  assert.ok(motion.rate > 0)
  assert.equal(getClickMotion(motion, -1, 1420, 26).target, 34)
  assert.equal(getClickMotion(motion, 1, 3000, 28).target, 29)
  assert.equal(getClickMotion(motion, -1, 3000, 1).target, 1)
})
