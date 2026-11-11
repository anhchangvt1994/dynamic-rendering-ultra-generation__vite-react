import { useEffect, useState } from 'react'

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Index of the current demo step, advancing every `ms` while `active`. Stops (and rests on
 * step 0, the static frame) when inactive or under reduced motion; the timer is always cleared.
 */
export function useDemoClock(count: number, ms: number, active: boolean): number {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (!active || count < 2 || reduced()) {
      setI(0)
      return
    }
    const t = setInterval(() => setI((n) => (n + 1) % count), ms)
    return () => clearInterval(t)
  }, [count, ms, active])
  return i
}
