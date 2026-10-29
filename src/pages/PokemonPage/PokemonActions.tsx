import { memo, useEffect, useState, useSyncExternalStore } from 'react'
import styled from 'styled-components'
import { isCaught, subscribeCaught, toggleCaught } from 'utils/caught.mjs'

const ActionsStyle = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin: 0 0 16px;

  button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 44px;
    padding: 0 16px 0 12px;
    border: none;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.12);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
    color: #fff;
    font: inherit;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition:
      background 140ms ease-out,
      transform 120ms ease-out;
  }
  button:hover {
    background: rgba(255, 255, 255, 0.2);
  }
  button:active {
    transform: scale(0.95);
  }
  button:focus-visible {
    outline: 2px solid #ffcb05;
    outline-offset: 2px;
  }
  svg {
    width: 20px;
    height: 20px;
    flex: none;
  }

  button[data-kind='shiny'][aria-pressed='true'] {
    background: linear-gradient(110deg, #ffe27a, #ff9ad8 50%, #8fd8ff);
    box-shadow: 0 0 14px rgba(255, 214, 120, 0.6);
    color: #2a1b00;
  }
  button[data-kind='caught'][aria-pressed='true'] {
    background: #e3350d;
    box-shadow: 0 3px 0 #a3220a;
  }
  button[data-kind='caught'][aria-pressed='true'] .ball {
    animation: caught-wobble 700ms ease-in-out;
  }

  .toast {
    flex-basis: 100%;
    margin: 0;
    min-height: 20px;
    font-size: 13px;
    color: #c9f9df;
    text-align: center;
  }

  @keyframes caught-wobble {
    0%,
    100% {
      rotate: 0deg;
    }
    20% {
      rotate: -22deg;
    }
    45% {
      rotate: 16deg;
    }
    70% {
      rotate: -8deg;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    button[data-kind='caught'][aria-pressed='true'] .ball {
      animation: none;
    }
  }
`

const Sparkle = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <path d="M12 2l1.8 5.6L19.5 9l-5.7 1.5L12 16l-1.8-5.5L4.5 9l5.7-1.4ZM19 14l.9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9ZM5 15l.7 1.8 1.8.7-1.8.7L5 20l-.7-1.8-1.8-.7 1.8-.7Z" />
  </svg>
)

const Ball = () => (
  <svg className="ball" viewBox="0 0 24 24" aria-hidden="true">
    <circle
      cx="12"
      cy="12"
      r="10"
      fill="#f4f4f4"
      stroke="#222"
      strokeWidth="2"
    />
    <path
      d="M2 12a10 10 0 0 1 20 0z"
      fill="#e3350d"
      stroke="#222"
      strokeWidth="2"
    />
    <path d="M2 12h20" stroke="#222" strokeWidth="2" />
    <circle
      cx="12"
      cy="12"
      r="3.2"
      fill="#f4f4f4"
      stroke="#222"
      strokeWidth="2"
    />
  </svg>
)

const ShareIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <path d="M18 22q-1.25 0-2.125-.875T15 19q0-.175.025-.363.025-.187.075-.337l-7.05-4.1q-.425.375-.95.588Q6.575 15 6 15q-1.25 0-2.125-.875T3 12q0-1.25.875-2.125T6 9q.575 0 1.1.212.525.213.95.588l7.05-4.1q-.05-.15-.075-.337Q15 5.175 15 5q0-1.25.875-2.125T18 2q1.25 0 2.125.875T21 5q0 1.25-.875 2.125T18 8q-.575 0-1.1-.213-.525-.212-.95-.587L8.9 11.3q.05.15.075.337Q9 11.825 9 12t-.025.363q-.025.187-.075.337l7.05 4.1q.425-.375.95-.588Q17.425 16 18 16q1.25 0 2.125.875T21 19q0 1.25-.875 2.125T18 22Z" />
  </svg>
)

/**
 * Shiny toggle, "Đã bắt" (caught) mark and share, for the selected Pokémon.
 * Shiny state is owned by the page (it swaps the stage artwork).
 */
const PokemonActions = memo(
  ({
    id,
    name,
    shiny,
    hasShiny,
    onShinyChange,
  }: {
    id: number
    name: string
    shiny: boolean
    hasShiny: boolean
    onShinyChange: (shiny: boolean) => void
  }) => {
    const caught = useSyncExternalStore(
      subscribeCaught,
      () => isCaught(id),
      () => false
    )
    const [toast, setToast] = useState('')
    useEffect(() => {
      if (!toast) return
      const timer = setTimeout(() => setToast(''), 2400)
      return () => clearTimeout(timer)
    }, [toast])

    const share = async () => {
      const url = location.href
      const title = `${name} – Pokédex`
      try {
        if (navigator.share) {
          await navigator.share({ title, url })
          return
        }
        await navigator.clipboard.writeText(url)
        setToast('Đã sao chép liên kết')
      } catch (error) {
        // the reader closing the share sheet is not an error
        if ((error as Error)?.name !== 'AbortError')
          setToast('Không chia sẻ được, hãy sao chép địa chỉ trang')
      }
    }

    return (
      <ActionsStyle>
        {hasShiny && (
          <button
            type="button"
            data-kind="shiny"
            aria-pressed={shiny}
            onClick={() => onShinyChange(!shiny)}
          >
            <Sparkle />
            Shiny
          </button>
        )}
        <button
          type="button"
          data-kind="caught"
          aria-pressed={caught}
          onClick={() => {
            const now = toggleCaught(id)
            setToast(now ? `Đã bắt ${name}!` : `Đã thả ${name}`)
          }}
        >
          <Ball />
          {caught ? 'Đã bắt' : 'Bắt'}
        </button>
        <button type="button" data-kind="share" onClick={share}>
          <ShareIcon />
          Chia sẻ
        </button>
        <p className="toast" role="status" aria-live="polite">
          {toast}
        </p>
      </ActionsStyle>
    )
  }
)

PokemonActions.displayName = 'PokemonActions'
export default PokemonActions
