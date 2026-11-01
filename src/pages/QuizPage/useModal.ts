import { useEffect, useRef } from 'react'
import { css } from 'styled-components'

/**
 * A native modal <dialog> driven by a boolean: the browser handles the top
 * layer, the focus trap and Esc. A click on the backdrop closes it too.
 */
export function useModal(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null)
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal?.()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const onCloseEvent = () => close.current()
    // the dialog itself has no padding: a click on it is a click outside
    const onClick = (event: MouseEvent) => {
      if (event.target === dialog) dialog.close()
    }
    dialog.addEventListener('close', onCloseEvent)
    dialog.addEventListener('click', onClick)
    return () => {
      dialog.removeEventListener('close', onCloseEvent)
      dialog.removeEventListener('click', onClick)
    }
  }, [])

  return ref
}

export const dialogCss = css`
  width: min(var(--dialog-w, 440px), calc(100vw - 24px));
  max-width: none;
  max-height: calc(100svh - 24px);
  margin: auto;
  padding: 0;
  border: none;
  background: none;
  color: #fff;
  overflow: visible;

  &::backdrop {
    background: rgba(3, 8, 18, 0.74);
    -webkit-backdrop-filter: blur(6px);
    backdrop-filter: blur(6px);
  }
  &[open] {
    animation: dialog-in 420ms cubic-bezier(0.2, 1.4, 0.4, 1);
  }
  &[open]::backdrop {
    animation: dialog-fade 300ms ease-out;
  }
  .dialog-close {
    position: absolute;
    right: 10px;
    top: 10px;
    z-index: 5;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border: none;
    border-radius: 50%;
    background: rgba(5, 15, 28, 0.55);
    color: #fff;
    font: inherit;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
  }
  .dialog-close:focus-visible,
  button:focus-visible {
    outline: 3px solid #ffda55;
    outline-offset: 2px;
  }
  @keyframes dialog-in {
    from {
      opacity: 0;
      transform: translateY(24px) scale(0.92);
    }
  }
  @keyframes dialog-fade {
    from {
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    &,
    &::backdrop,
    *,
    *::before,
    *::after {
      animation: none !important;
      transition: none !important;
    }
  }
`
