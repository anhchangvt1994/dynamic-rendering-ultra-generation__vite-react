import { useEffect, useRef, useState } from 'react'

/** "Sao chép liên kết": the address of the article to the clipboard, said aloud. */
export default function CopyLink() {
  const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setState('done')
    } catch {
      setState('failed')
    }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setState('idle'), 2200)
  }

  return (
    <button type="button" className="blog-copy" data-state={state} onClick={copy}>
      <span aria-live="polite">
        {state === 'done'
          ? 'Đã chép liên kết'
          : state === 'failed'
            ? 'Chưa chép được'
            : 'Sao chép liên kết'}
      </span>
    </button>
  )
}
