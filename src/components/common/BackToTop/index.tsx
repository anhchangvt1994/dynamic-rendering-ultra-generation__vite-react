import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import styled from 'styled-components'

// Appears after about a screen and a half of scrolling, in thumb reach.
const SHOW_AFTER = 1.5

const BackToTopStyle = styled.button`
  position: absolute;
  z-index: 20;
  right: 16px;
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: none;
  cursor: pointer;
  filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.4));
  transition:
    opacity 200ms ease-out,
    transform 260ms cubic-bezier(0.16, 1, 0.3, 1);

  &[data-visible='false'] {
    opacity: 0;
    transform: translateY(24px) scale(0.85);
    pointer-events: none;
  }

  svg {
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  .arrow {
    transition: transform 200ms ease-out;
  }
  &:hover .arrow,
  &:focus-visible .arrow {
    transform: translateY(-3px);
  }
  &:active {
    transform: scale(0.92);
  }
  &:focus-visible {
    outline: 2px solid #ffcb05;
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: opacity 120ms linear;
    &[data-visible='false'] {
      transform: none;
    }
  }
`

/** A Poké Ball whose button carries an up arrow: scrolls `scroller` home. */
export default function BackToTop({
  scrollerRef,
}: {
  scrollerRef: RefObject<HTMLElement | null>
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    let frame = 0
    const update = () => {
      frame = 0
      setVisible(scroller.scrollTop > scroller.clientHeight * SHOW_AFTER)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => {
      cancelAnimationFrame(frame)
      scroller.removeEventListener('scroll', onScroll)
    }
  }, [scrollerRef])

  const toTop = () => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    scrollerRef.current?.scrollTo({
      top: 0,
      behavior: reduce ? 'auto' : 'smooth',
    })
  }

  return (
    <BackToTopStyle
      type="button"
      aria-label="Lên đầu trang"
      data-visible={visible}
      tabIndex={visible ? 0 : -1}
      onClick={toTop}
    >
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="#f4f4f4"
          stroke="#222"
          strokeWidth="5"
        />
        <path
          d="M4 50a46 46 0 0 1 92 0z"
          fill="#e3350d"
          stroke="#222"
          strokeWidth="5"
        />
        <path d="M4 50h30M66 50h30" stroke="#222" strokeWidth="5" />
        <circle
          cx="50"
          cy="50"
          r="15"
          fill="#f4f4f4"
          stroke="#222"
          strokeWidth="5"
        />
        <path
          className="arrow"
          d="M43 53l7-8 7 8"
          fill="none"
          stroke="#222"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </BackToTopStyle>
  )
}
