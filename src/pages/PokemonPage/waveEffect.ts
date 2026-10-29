import type { SwiperModule } from 'swiper/types'
import { getWaveVisual } from './navigation.mjs'

// Sample the wrapper's actual painted position, including CSS momentum and
// retargeted clicks. Swiper's slide.progress is the destination during a CSS
// transition, so using it directly makes the zoom jump ahead of the image.
const WaveEffect: SwiperModule = ({ swiper, on }) => {
  let frame = 0
  let animateUntil = 0
  const visible = new WeakSet<HTMLElement>()

  const paint = () => {
    frame = 0
    if (swiper.destroyed || !swiper.slides.length) return
    const width = swiper.slidesSizesGrid[swiper.activeIndex] || swiper.width / 3
    if (!width) return
    // A direct drag already supplies the exact numeric translate. Reading its
    // computed transform again forces style work on every input frame.
    const translate =
      performance.now() < animateUntil
        ? swiper.getTranslate()
        : swiper.translate
    const position = (-translate - (swiper.slidesGrid[0] || 0)) / width

    swiper.slides.forEach((slide) => {
      const index = Number(slide.dataset.swiperSlideIndex)
      const progress = index - position
      const visual = slide.firstElementChild as HTMLElement | null
      if (!visual) return
      if (Math.abs(progress) > 2.5) {
        if (visible.has(visual) || !visual.dataset.waveVisible) {
          visual.style.opacity = '0'
          visual.dataset.waveVisible = 'false'
          slide.setAttribute('aria-hidden', 'true')
          visible.delete(visual)
        }
        return
      }
      const wave = getWaveVisual(progress)
      visual.dataset.waveVisible = 'true'
      visible.add(visual)
      visual.style.transform = `translate3d(0, ${wave.y.toFixed(3)}px, 0) scale(${wave.scale.toFixed(4)})`
      visual.style.opacity = wave.opacity.toFixed(4)
      visual.style.filter = `blur(${wave.blur.toFixed(3)}px)`
      slide.style.zIndex = String(Math.round(wave.opacity * 100))
      slide.setAttribute('aria-hidden', String(Math.abs(progress) > 1.5))
    })
    if (performance.now() < animateUntil) frame = requestAnimationFrame(paint)
  }
  const requestPaint = () => {
    if (!frame && !swiper.destroyed) frame = requestAnimationFrame(paint)
  }
  on('init', requestPaint)
  on('setTranslate', requestPaint)
  on('resize', requestPaint)
  on('slidesUpdated', requestPaint)
  on('setTransition', (_instance, duration) => {
    animateUntil = duration ? performance.now() + duration + 50 : 0
    requestPaint()
  })
  on('transitionEnd', () => {
    animateUntil = 0
    requestPaint()
  })
  on('destroy', () => {
    cancelAnimationFrame(frame)
    frame = 0
  })
}

export default WaveEffect
