import styled from 'styled-components'
import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'

const RIFT_MS = 1700

/** What Palkia did for the round, said in one short line. */
export function palkiaSays(removed: number, letter: string | null) {
  if (removed && letter)
    return `Palkia góp sức! Còn 2 lựa chọn · chữ đầu ${letter}`
  if (removed) return 'Palkia góp sức! Chỉ còn 2 lựa chọn'
  return `Palkia góp sức! Tên bắt đầu bằng chữ ${letter}`
}

/**
 * Palkia bends space: a pearl-pink tear rips down the stage, swirls, and
 * seals again, while the options it took away twist into it (styles.tsx,
 * .options li[data-removed='fresh']).
 */
export default function PalkiaRift({ onEnd }: { onEnd: () => void }) {
  const end = useRef(onEnd)
  end.current = onEnd
  useEffect(() => {
    const timer = window.setTimeout(() => end.current(), RIFT_MS)
    return () => clearTimeout(timer)
  }, [])
  return (
    <RiftStyle className="palkia-rift" aria-hidden="true">
      <span className="pr-swirl" />
      <svg className="pr-tear" viewBox="0 0 60 300" preserveAspectRatio="none">
        <path d="M30 0L38 34 24 70 41 108 20 150 39 190 25 228 36 262 30 300 27 262 15 228 30 190 12 150 33 108 17 70 26 34Z" />
      </svg>
      {Array.from({ length: 12 }, (_, i) => (
        <i key={i} style={{ '--i': i } as CSSProperties} />
      ))}
    </RiftStyle>
  )
}

/** The first letter Palkia told, kept on the stage for the round. */
export function PalkiaLetter({ letter }: { letter: string }) {
  return (
    <p className="palkia-letter">
      <span aria-hidden="true" className="pl-pearl" />
      Chữ đầu: <b>{letter}</b>
    </p>
  )
}

const RiftStyle = styled.div`
  position: absolute;
  inset: 0;
  z-index: 5;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;

  /* space folding in around the tear */
  .pr-swirl {
    position: absolute;
    width: 140%;
    aspect-ratio: 1;
    border-radius: 50%;
    background: conic-gradient(
      from 0deg,
      transparent 0 10%,
      rgba(255, 170, 220, 0.35) 18%,
      transparent 30% 55%,
      rgba(200, 160, 255, 0.35) 65%,
      transparent 78%
    );
    mix-blend-mode: screen;
    animation: pr-swirl ${RIFT_MS}ms cubic-bezier(0.4, 0, 0.2, 1) both;
  }
  .pr-tear {
    position: relative;
    width: 18%;
    height: 112%;
    fill: #fff;
    filter: drop-shadow(0 0 6px #ffd1ec) drop-shadow(0 0 18px #ff7ccf)
      drop-shadow(0 0 34px #b07cff);
    transform-origin: 50% 50%;
    animation: pr-tear ${RIFT_MS}ms cubic-bezier(0.3, 0, 0.2, 1) both;
  }
  /* sparks of space pulled into the tear */
  i {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #ffe3f4;
    box-shadow: 0 0 8px #ff7ccf;
    --a: calc(var(--i) * 30deg);
    animation: pr-spark ${RIFT_MS}ms ease-in both;
    animation-delay: calc(var(--i) * 40ms);
  }

  @keyframes pr-swirl {
    from {
      opacity: 0;
      transform: rotate(0) scale(0.4);
    }
    25% {
      opacity: 1;
    }
    to {
      opacity: 0;
      transform: rotate(320deg) scale(1);
    }
  }
  @keyframes pr-tear {
    0% {
      opacity: 0;
      transform: scaleX(0) scaleY(0.2);
    }
    18% {
      opacity: 1;
      transform: scaleX(0.3) scaleY(1);
    }
    55% {
      transform: scaleX(1.2) scaleY(1) skewY(-4deg);
    }
    85% {
      opacity: 1;
      transform: scaleX(0.15) scaleY(1);
    }
    100% {
      opacity: 0;
      transform: scaleX(0) scaleY(1);
    }
  }
  @keyframes pr-spark {
    from {
      opacity: 0;
      transform: rotate(var(--a)) translateY(-170px) scale(1.4);
    }
    30% {
      opacity: 1;
    }
    to {
      opacity: 0;
      transform: rotate(calc(var(--a) + 160deg)) translateY(0) scale(0.2);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .pr-swirl,
    i {
      display: none;
    }
    .pr-tear {
      animation: pr-fade ${RIFT_MS}ms ease-out both;
    }
    @keyframes pr-fade {
      from {
        opacity: 0.8;
        transform: none;
      }
      to {
        opacity: 0;
      }
    }
  }
`
