import { useEffect, useLayoutEffect, useState, type HTMLAttributes, type ReactNode } from 'react'
import Bulbs from './Bulbs'
import Carousel from './Carousel'
import { shouldReveal } from './reveal.mjs'
import { HubShellStyle } from './styles.hub'

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

type Props = { children: ReactNode; skeleton?: boolean } & HTMLAttributes<HTMLDivElement>

/** Sky, felt and bulbs around a grid of fixed-size regions (data-region). */
export default function HubShell({ children, skeleton, ...rest }: Props) {
  const [reveal, setReveal] = useState(false)
  const [paused, setPaused] = useState(false)

  useIsoLayoutEffect(() => {
    if (skeleton) return
    let storage: Storage | null = null
    try {
      storage = window.sessionStorage
    } catch {
      storage = null
    }
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    setReveal(shouldReveal(storage, reduced))
  }, [skeleton])

  useEffect(() => {
    const sync = () => setPaused(document.hidden)
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [])

  return (
    <HubShellStyle
      data-reveal={reveal || undefined}
      data-paused={paused || undefined}
      data-hub-shell
      {...rest}
    >
      <div className="hub-felt" aria-hidden="true" />
      <Bulbs />
      <div className="hub-grid">{children}</div>
    </HubShellStyle>
  )
}

/** Wrapper for the cabinets (one per game): a snap row on phones, a grid from md. */
export const HubBooths = ({ children, skeleton }: { children: ReactNode; skeleton?: boolean }) => (
  <Carousel skeleton={skeleton}>{children}</Carousel>
)
