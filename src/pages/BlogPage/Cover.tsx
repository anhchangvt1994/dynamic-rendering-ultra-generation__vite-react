import type { CSSProperties, ReactNode } from 'react'
import { useCallback, useState } from 'react'

/**
 * An article's cover: its own colour fills the box (a fixed aspect ratio set
 * by the parent) while the picture loads, then the picture fades in. Opacity
 * only, nothing moves. A picture that fails stays the colour.
 */
export default function Cover(props: CoverProps) {
  // a new picture starts over: its own wait / loaded / failed state
  return <CoverBox key={props.src ?? ''} {...props} />
}

interface CoverProps {
  src?: string | null
  alt?: string
  color: string
  priority?: boolean
  className?: string
  children?: ReactNode
}

function CoverBox({
  src,
  alt = '',
  color,
  priority = false,
  className = '',
  children,
}: CoverProps) {
  const [state, setState] = useState<'wait' | 'loaded' | 'failed'>('wait')
  // a picture the browser had before React took over never fires onLoad
  const ref = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete) setState(img.naturalWidth > 0 ? 'loaded' : 'failed')
  }, [])
  return (
    <span
      className={`cover ${className}`}
      style={{ '--cover': color } as CSSProperties}
      data-state={state}
    >
      {src && state !== 'failed' && (
        <img
          ref={ref}
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          decoding="async"
          onLoad={() => setState('loaded')}
          onError={() => setState('failed')}
        />
      )}
      {children}
    </span>
  )
}
