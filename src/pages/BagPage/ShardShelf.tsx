import {
  memo,
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import styled from 'styled-components'
import AmberCard from './crafting/AmberCard'
import { craftMessage } from './crafting/messages.mjs'
import type { CraftState } from './crafting/useCardCraft'
import IndividualsDialog from './individuals/IndividualsDialog'
import TradeDialog from './individuals/TradeDialog'
import TradeResultDialog from './individuals/TradeResultDialog'
import WelcomeDialog from './individuals/WelcomeDialog'
import { tradeMessage } from './individuals/messages.mjs'
import type { useIndividuals } from './individuals/useIndividuals'
import type { ShardRow } from './shardStore'
import {
  shelfCounts,
  shelfFilter,
  shelfRenderWindow,
  shelfRowPitch,
  shelfWindow,
} from './shelfPaging.mjs'

// the join plays for this long, then the real (refreshed) numbers show
const JOIN_MS = 850

const Shelf = styled.div`
  display: grid;
  gap: 12px;
  min-width: 0;
  > * {
    min-width: 0;
  }
  .shard-banner {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    margin: 0;
    padding: 10px 12px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.08);
    font-size: 14px;
  }
  .shard-banner button {
    font: inherit;
    color: inherit;
    text-decoration: underline;
    background: none;
    border: 0;
    padding: 6px 0;
    cursor: pointer;
  }
  .shard-grid {
    --shard-columns: 1;
    list-style: none;
    margin: 0;
    /* 54px lead; the rows not mounted keep their height as padding */
    padding: calc(54px + var(--shard-top, 0px)) 0 var(--shard-bottom, 0px);
    display: grid;
    gap: 62px 18px;
    grid-auto-rows: minmax(457px, auto);
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 310px), 1fr));
  }
  @media (min-width: 640px) {
    .shard-grid {
      --shard-columns: 2;
    }
  }
  @media (min-width: 1024px) {
    .shard-grid {
      --shard-columns: 3;
    }
  }
  /* a specimen case: the stone breaks out of the top edge, on its own plinth */
  .shard {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 0 16px 16px;
    border-radius: 22px 22px 18px 18px;
    background:
      radial-gradient(
        ellipse 70% 38% at 50% 0%,
        rgba(255, 190, 80, 0.22),
        transparent 100%
      ),
      linear-gradient(180deg, rgba(40, 24, 8, 0.58), rgba(18, 12, 6, 0.74) 60%);
    box-shadow:
      inset 0 0 0 1px rgba(255, 214, 140, 0.16),
      inset 0 -14px 24px rgba(0, 0, 0, 0.3);
    text-align: left;
    /* its own compositor layer: rasterised once, ahead of the scroll, so a
       fast flick moves finished layers instead of painting tiles late */
    contain: layout style;
  }
  .shard::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 96px;
    width: 170px;
    height: 26px;
    margin-left: -85px;
    border-radius: 50%;
    background: radial-gradient(
      ellipse at center,
      rgba(0, 0, 0, 0.5),
      transparent 70%
    );
    pointer-events: none;
  }
  .shard[data-ready] {
    box-shadow:
      inset 0 0 0 2px #ffe08a,
      0 0 26px rgba(255, 190, 70, 0.3);
  }
  .shard-cell {
    position: relative;
    z-index: 1;
    width: 204px;
    margin: -64px auto -8px;
    flex: none;
  }
  .shard-info {
    flex: 1;
    align-content: start;
    display: grid;
    gap: 8px;
    min-width: 0;
  }
  .shard-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 8px;
  }
  .shard-name {
    font-size: 19px;
    line-height: 1.1;
    overflow-wrap: anywhere;
  }
  .shard-meter {
    flex: none;
    text-align: right;
    line-height: 1;
  }
  .shard-meter b {
    font-size: 34px;
    font-weight: 800;
    color: #ffe27a;
    text-shadow: 0 2px 0 #7a3a04;
  }
  .shard-meter small {
    font-size: 15px;
    font-weight: 700;
    opacity: 0.7;
  }
  .shard-note {
    font-size: 12px;
    font-weight: 700;
    color: #ffd37a;
    min-height: 15px;
  }
  /* one chip of amber per shard */
  .shard-pips {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }
  .shard-pips i {
    flex: 1 1 0;
    min-width: 7px;
    height: 12px;
    background: rgba(255, 255, 255, 0.1);
    clip-path: polygon(14% 0, 100% 8%, 86% 100%, 0 90%);
    transition: background 400ms ease;
  }
  .shard-pips i[data-on] {
    background: linear-gradient(160deg, #fff0a0, #f0a02a 60%, #a8500a);
  }
  .shard-actions {
    margin-top: auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .shard-actions button {
    width: 100%;
    min-width: 0;
    white-space: nowrap;
    padding-inline: 6px;
  }
  @media (max-width: 360px) {
    .shard-actions {
      grid-template-columns: minmax(0, 1fr);
    }
    .shard-actions button {
      white-space: normal;
      font-size: 12px;
    }
  }
  /* the finished stones: a fan of real amber, not a tag */
  .shard-vault {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 6px 14px 6px 8px;
    border-radius: 16px;
    background: linear-gradient(
      135deg,
      rgba(255, 217, 102, 0.2),
      rgba(255, 156, 42, 0.08)
    );
    box-shadow: inset 0 0 0 1px rgba(255, 217, 102, 0.4);
    color: #ffe7a0;
    font-size: 13px;
    font-weight: 700;
  }
  .shard-vault-stones {
    display: flex;
    padding-left: 4px;
  }
  .shard-vault-stone {
    position: relative;
    width: 52px;
    height: 52px;
    margin-left: -16px;
    z-index: calc(3 - var(--i));
  }
  .shard-vault-fan {
    margin-left: 0;
  }
  .shard-vault-stone:first-child {
    margin-left: 0;
  }
  .shard-vault b {
    font-size: 20px;
    margin-right: 3px;
    font-variant-numeric: tabular-nums;
  }
  /* the ready glow pulses as opacity on a pre-painted layer, never by
     repainting a 34px blur every frame */
  .shard[data-ready]:not([data-joining])::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    box-shadow:
      inset 0 0 0 2px #fff0b0,
      0 0 34px rgba(255, 190, 70, 0.5);
    opacity: 0;
    pointer-events: none;
    animation: shard-ready 1800ms ease-in-out infinite;
  }
  @keyframes shard-ready {
    50% {
      opacity: 1;
    }
  }
  /* cost control: inside the amber SVG the endless motion (sparks, sweeps,
     straining pieces) re-rasterises every filter each frame, so it only plays
     under a pointer. Everything else holds still while the shelf scrolls. */
  .shard:not(:hover):not(:focus-within) .amber-spark,
  .shard:not(:hover):not(:focus-within) .amber-piece,
  .shard:not(:hover):not(:focus-within) .amber-ghost,
  .shard:not(:hover):not(:focus-within) .amber-aura,
  .shard:not(:hover):not(:focus-within) .amber-orbit,
  .shard:not(:hover):not(:focus-within) .amber-whole,
  .shard:not(:hover):not(:focus-within) .amber-glint {
    animation: none;
  }
  .shard:not(:hover):not(:focus-within) .amber-sweep {
    display: none;
  }
  /* the stone's drop-shadows are two full-card blurs per stone: only under a pointer */
  .shard:not(:hover):not(:focus-within)
    :is(.shard-cell, .shard-vault-stone)
    > span {
    filter: none;
  }
  .shard-craft {
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    min-height: 44px;
    max-width: 100%;
    padding: 8px 12px;
    border-radius: 12px;
    border: 2px solid #a45a12;
    color: #4a2706;
    background: linear-gradient(180deg, #ffe7a0, #f2a93b);
    cursor: pointer;
  }
  .shard-craft[aria-disabled='true'] {
    cursor: default;
    color: rgba(255, 255, 255, 0.72);
    border-color: rgba(255, 231, 160, 0.35);
    background: rgba(255, 255, 255, 0.07);
  }
  .shard-craft:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 2px;
  }
  .shard-trade {
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    min-height: 44px;
    max-width: 100%;
    padding: 8px 10px;
    border-radius: 12px;
    border: 1px solid rgba(255, 231, 160, 0.5);
    color: #ffe7a0;
    background: rgba(255, 255, 255, 0.06);
    cursor: pointer;
  }
  .shard-trade[aria-disabled='true'] {
    cursor: not-allowed;
    opacity: 0.45;
    border-style: dashed;
  }
  .shard-noterow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .shard-own {
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    min-height: 44px;
    padding: 4px 12px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #fff;
    background: rgba(255, 255, 255, 0.14);
    cursor: pointer;
  }
  .shard-trade:focus-visible,
  .shard-own:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 2px;
  }
  .shard-status {
    min-height: 16px;
    font-size: 12px;
    line-height: 16px;
    color: #ffe7a0;
  }
  .shard-live {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .shard-name {
    font-weight: 700;
    text-transform: capitalize;
  }
  .shard-rate {
    font-size: 12px;
    opacity: 0.75;
  }
  /* a case still on its way: the same frame as a real one, so nothing jumps */
  .shard-skeleton {
    pointer-events: none;
    min-height: 330px;
    background: linear-gradient(
      180deg,
      rgba(40, 24, 8, 0.4),
      rgba(18, 12, 6, 0.55) 60%
    );
    box-shadow: inset 0 0 0 1px rgba(255, 214, 140, 0.1);
  }
  .shard-skeleton::before {
    display: none;
  }
  .shard-skeleton > i,
  .shard-skeleton span i {
    display: block;
    border-radius: 8px;
    background: linear-gradient(
      100deg,
      rgba(255, 214, 140, 0.08) 30%,
      rgba(255, 224, 160, 0.2) 50%,
      rgba(255, 214, 140, 0.08) 70%
    );
    background-size: 300% 100%;
    animation: shard-shimmer 1.4s linear infinite;
  }
  .shard-skeleton .bone-stone {
    width: 150px;
    height: 150px;
    margin: -54px auto 6px;
    border-radius: 46% 54% 50% 50% / 52% 46% 54% 48%;
  }
  .shard-skeleton .bone-head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }
  .shard-skeleton .bone-head i:first-child {
    width: 46%;
    height: 20px;
  }
  .shard-skeleton .bone-head i:last-child {
    width: 22%;
    height: 32px;
  }
  .shard-skeleton .bone-line {
    height: 12px;
  }
  .shard-skeleton .bone-line.short {
    width: 40%;
  }
  .shard-skeleton .bone-actions {
    margin-top: auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .shard-skeleton .bone-actions i {
    height: 44px;
    border-radius: 12px;
  }
  @keyframes shard-shimmer {
    from {
      background-position: 100% 0;
    }
    to {
      background-position: -200% 0;
    }
  }
  .shard[data-fresh] {
    animation: shard-in 420ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
    animation-delay: calc(var(--n, 0) * 40ms);
  }
  @keyframes shard-in {
    from {
      opacity: 0;
      transform: translateY(14px) scale(0.985);
    }
  }
  /* the shelf's own toolbar: which stones, how many */
  .shelf-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px 14px;
  }
  .shelf-filters {
    display: flex;
    gap: 4px;
    padding: 4px;
    border-radius: 14px;
    background: rgba(0, 0, 0, 0.28);
    box-shadow: inset 0 0 0 1px rgba(255, 214, 140, 0.12);
    max-width: 100%;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .shelf-filters::-webkit-scrollbar {
    display: none;
  }
  .shelf-filters button {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 38px;
    padding: 0 12px;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: rgba(255, 238, 200, 0.72);
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
    cursor: pointer;
  }
  .shelf-filters button:hover:not([aria-pressed='true']) {
    color: #fff3d0;
    background: rgba(255, 255, 255, 0.06);
  }
  .shelf-filters button[aria-pressed='true'] {
    color: #4a2706;
    background: linear-gradient(180deg, #ffe7a0, #f2a93b);
    box-shadow: 0 2px 0 #a45a12;
  }
  .shelf-filters button span {
    min-width: 22px;
    padding: 1px 6px;
    border-radius: 7px;
    background: rgba(255, 255, 255, 0.1);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    text-align: center;
  }
  .shelf-filters button[aria-pressed='true'] span {
    background: rgba(74, 39, 6, 0.14);
  }
  .shelf-filters button:focus-visible,
  .shelf-more button:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 2px;
  }
  .shelf-stones {
    font-size: 13px;
    color: rgba(255, 238, 200, 0.75);
  }
  .shelf-stones b {
    color: #ffe27a;
    font-variant-numeric: tabular-nums;
  }
  /* the end of the page: progress, then one more page */
  .shelf-more {
    display: grid;
    justify-items: center;
    gap: 10px;
    padding: 18px 0 4px;
    text-align: center;
  }
  .shelf-more p {
    margin: 0;
    font-size: 12px;
    color: rgba(255, 238, 200, 0.7);
    font-variant-numeric: tabular-nums;
  }
  .shelf-more progress {
    appearance: none;
    width: min(240px, 70%);
    height: 6px;
    border: 0;
    border-radius: 99px;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.1);
  }
  .shelf-more progress::-webkit-progress-bar {
    background: rgba(255, 255, 255, 0.1);
  }
  .shelf-more progress::-webkit-progress-value {
    background: linear-gradient(90deg, #f2a93b, #ffe27a);
    border-radius: 99px;
  }
  .shelf-more progress::-moz-progress-bar {
    background: linear-gradient(90deg, #f2a93b, #ffe27a);
  }
  .shelf-more button {
    font: inherit;
    font-size: 14px;
    font-weight: 800;
    min-height: 46px;
    padding: 0 22px;
    border-radius: 14px;
    border: 2px solid #a45a12;
    color: #4a2706;
    background: linear-gradient(180deg, #ffe7a0, #f2a93b);
    box-shadow: 0 3px 0 #7a3a04;
    cursor: pointer;
  }
  .shelf-more button:active {
    transform: translateY(2px);
    box-shadow: 0 1px 0 #7a3a04;
  }
  .shelf-more button[aria-busy='true'] {
    cursor: progress;
    opacity: 0.8;
  }
  .shelf-sentinel {
    height: 1px;
    margin-top: -1px;
  }
  .shelf-empty {
    margin: 0;
    padding: 28px 16px;
    border-radius: 18px;
    border: 1px dashed rgba(255, 214, 140, 0.3);
    text-align: center;
    color: rgba(255, 238, 200, 0.8);
    font-size: 14px;
  }
  .shelf-filters b {
    font-weight: inherit;
  }
  /* a phone: three equal tabs, the count under its name */
  @media (max-width: 480px) {
    .shelf-filters {
      width: 100%;
    }
    .shelf-filters button {
      flex: 1 1 0;
      min-width: 0;
      flex-direction: column;
      justify-content: center;
      gap: 2px;
      min-height: 50px;
      padding: 4px;
      font-size: 12px;
    }
    .shelf-filters b[data-short] {
      font-size: 0;
    }
    .shelf-filters b[data-short]::after {
      content: attr(data-short);
      font-size: 12px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .shard-skeleton > i,
    .shard-skeleton span i,
    .shard[data-fresh],
    .shard[data-ready],
    .shard[data-ready]::after {
      animation: none;
    }
  }
`

type Individuals = ReturnType<typeof useIndividuals>

const Row = memo(function Row({
  row,
  state,
  craft,
  tradeState,
  owned,
  onTrade,
  onList,
  fresh,
}: {
  fresh?: number
  row: ShardRow
  state: CraftState | undefined
  craft?: (speciesId: number) => void
  tradeState?: Individuals['states'][number]
  owned: number
  onTrade?: (speciesId: number) => void
  onList: (speciesId: number) => void
}) {
  // the numbers as they were when the player pressed: kept while the join plays
  const [held, setHeld] = useState<number | null>(null)
  const joining = useRef(false)
  const kind = state?.kind
  useEffect(() => {
    if (kind === 'success' && held !== null && !joining.current) {
      joining.current = true
      const timer = window.setTimeout(() => {
        joining.current = false
        setHeld(null)
      }, JOIN_MS)
      return () => {
        window.clearTimeout(timer)
        joining.current = false
      }
    }
    // an uncertain answer or a refusal never plays the join
    if (kind === 'uncertain' || kind === 'error') setHeld(null)
  }, [kind, held])

  // a stone that lands after the join: it arrives with a burst (not on first load)
  const [gained, setGained] = useState(false)
  const lastCards = useRef(row.cardCount)
  useEffect(() => {
    if (row.cardCount > lastCards.current) setGained(true)
    lastCards.current = row.cardCount
  }, [row.cardCount])
  const playing = held !== null && kind === 'success'
  const shown = playing ? held : row.count
  const ready = shown >= row.required
  const busy = kind === 'submitting'
  const canPress = ready && !busy && !playing
  const missing = Math.max(0, row.required - row.count)
  const label = busy
    ? 'Đang ghép…'
    : kind === 'uncertain'
      ? 'Kiểm tra lại'
      : ready
        ? `Ghép ${row.required} mảnh`
        : `Cần thêm ${missing} mảnh`
  const retry = kind === 'uncertain'
  const trading = tradeState?.kind === 'submitting'
  const tradeRetry = tradeState?.kind === 'uncertain'
  const message =
    tradeMessage(row.name, tradeState) ?? craftMessage(row.name, state)
  return (
    <li
      className="shard"
      data-ready={ready || undefined}
      data-joining={playing || undefined}
      data-species={row.speciesId}
      data-fresh={fresh === undefined ? undefined : ''}
      style={
        fresh === undefined ? undefined : ({ '--n': fresh } as CSSProperties)
      }
      aria-label={`${row.name}, ${row.count} trên ${row.required} mảnh${
        row.count >= row.required ? ', đủ mảnh' : ''
      }, ${row.cardCount} viên hổ phách, tỉ lệ rơi ${Math.round(row.drop * 100)}%`}
    >
      <span className="shard-cell">
        <AmberCard
          speciesId={row.speciesId}
          name={row.name}
          count={shown}
          required={row.required}
          celebrating={playing}
        />
      </span>
      <div className="shard-info">
        <span className="shard-head" aria-hidden="true">
          <span className="shard-name">{row.name}</span>
          <span className="shard-meter">
            <b>{row.count}</b>
            <small>/{row.required}</small>
          </span>
        </span>
        <span className="shard-pips" aria-hidden="true">
          {Array.from({ length: row.required }, (_, i) => (
            <i
              key={i}
              data-on={i < Math.min(shown, row.required) || undefined}
            />
          ))}
        </span>
        <span className="shard-noterow">
          <span className="shard-note" aria-hidden="true">
            {Math.floor(row.count / row.required) > 1
              ? `ghép được ${Math.floor(row.count / row.required)} viên`
              : row.count >= row.required
                ? 'đủ mảnh để ghép'
                : `thiếu ${missing} mảnh`}
          </span>
          {owned > 0 && (
            <button
              type="button"
              className="shard-own"
              data-own={row.speciesId}
              onClick={() => onList(row.speciesId)}
            >
              Cá thể ×{owned}
            </button>
          )}
        </span>
        {row.cardCount > 0 && (
          <span className="shard-vault" aria-hidden="true">
            <span className="shard-vault-stones">
              {gained ? (
                Array.from({ length: Math.min(3, row.cardCount) }, (_, i) => {
                  const last = i === Math.min(3, row.cardCount) - 1
                  return (
                    <span
                      key={last ? `new-${row.cardCount}` : i}
                      className="shard-vault-stone"
                      style={{ '--i': i } as CSSProperties}
                    >
                      <AmberCard
                        speciesId={row.speciesId}
                        name={row.name}
                        count={row.required}
                        required={row.required}
                        complete
                        arrive={last}
                      />
                    </span>
                  )
                })
              ) : (
                <span
                  className="shard-vault-stone shard-vault-fan"
                  style={{
                    width: 52 + 36 * (Math.min(3, row.cardCount) - 1),
                  }}
                >
                  <AmberCard
                    speciesId={row.speciesId}
                    name={row.name}
                    count={row.required}
                    required={row.required}
                    complete
                    copies={Math.min(3, row.cardCount)}
                  />
                </span>
              )}
            </span>
            <span>
              Đã ghép <b>{row.cardCount}</b> viên
            </span>
          </span>
        )}
        <span className="shard-rate" aria-hidden="true">
          Tỉ lệ rơi {Math.round(row.drop * 100)}%
        </span>
        <span className="shard-status" aria-hidden="true">
          {message}
        </span>
      </div>
      <div className="shard-actions">
        {craft && (
          <button
            type="button"
            className="shard-craft"
            data-craft={row.speciesId}
            aria-disabled={!(canPress || retry) || undefined}
            onClick={() => {
              if (!(canPress || retry)) return
              setHeld(row.count)
              craft(row.speciesId)
            }}
          >
            {label}
          </button>
        )}
        {onTrade && (
          <button
            type="button"
            className="shard-trade"
            data-trade={row.speciesId}
            aria-disabled={trading || row.cardCount < 1 || undefined}
            onClick={() => {
              if (!trading && row.cardCount > 0) onTrade(row.speciesId)
            }}
          >
            {trading
              ? 'Đang đổi…'
              : tradeRetry
                ? 'Kiểm tra lại'
                : 'Đổi lấy Pokémon'}
          </button>
        )}
      </div>
    </li>
  )
})

/** A case on its way, the shape of a real one. */
function Bone() {
  return (
    <li className="shard shard-skeleton" aria-hidden="true">
      <i className="bone-stone" />
      <span className="bone-head">
        <i />
        <i />
      </span>
      <i className="bone-line" />
      <i className="bone-line short" />
      <span className="bone-actions">
        <i />
        <i />
      </span>
    </li>
  )
}

const FILTERS = [
  ['all', 'Tất cả', 'Tất cả'],
  ['ready', 'Ghép được', 'Đủ mảnh'],
  ['amber', 'Có hổ phách', 'Hổ phách'],
] as const
type Filter = (typeof FILTERS)[number][0]
// long enough for the skeletons to read as "coming", short enough not to wait
const PAGE_MS = 320
// the nearest ancestor that scrolls: the bag scrolls inside <main>, not the window
function scrollParent(node: HTMLElement): HTMLElement | Window {
  for (let n = node.parentElement; n; n = n.parentElement)
    if (/(auto|scroll)/.test(getComputedStyle(n).overflowY)) return n
  return window
}
// grid geometry shared with .shard-grid: lead padding, row 392 + gap 62
const SHELF_LEAD = 54
const SHELF_ROW_PITCH = 454

export default function ShardShelf({
  rows,
  pending,
  loading,
  error,
  retry,
  states = {},
  craft,
  individuals,
}: {
  rows: ShardRow[] | null
  pending: number
  loading: boolean
  error: Error | null
  retry: () => void
  states?: Record<number, CraftState>
  craft?: (speciesId: number) => void
  individuals?: Individuals
}) {
  const [confirming, setConfirming] = useState<number | null>(null)
  const [offerTrade, setOfferTrade] = useState<number | null>(null)
  const [listing, setListing] = useState<number | null>(null)
  const [heldOrder, setHeldOrder] = useState<ShardRow[] | null>(null)
  const orderHeld =
    confirming !== null ||
    offerTrade !== null ||
    Boolean(individuals?.welcome || individuals?.batchSummary)
  const displayRows = useMemo(
    () => (orderHeld ? (heldOrder ?? rows ?? []) : (rows ?? [])),
    [orderHeld, heldOrder, rows]
  )
  useEffect(() => {
    if (orderHeld && heldOrder === null) setHeldOrder(rows ?? [])
    if (!orderHeld && heldOrder !== null) setHeldOrder(null)
  }, [orderHeld, heldOrder, rows])
  const [filter, setFilter] = useState<Filter>('all')
  const [pages, setPages] = useState(1)
  const [paging, setPaging] = useState(false)
  // the band of grid rows in view: it changes a few times per screen of
  // scrolling, not on every scroll event
  const [band, setBand] = useState({
    first: 0,
    last: 2,
    columns: 1,
    pitch: SHELF_ROW_PITCH,
    direction: 'down' as 'up' | 'down',
  })
  const grid = useRef<HTMLUListElement>(null)
  // rows from this index on came with the last page: they rise in
  const freshFrom = useRef(Infinity)
  const counts = useMemo(() => shelfCounts(rows ?? []), [rows])
  const kept = useMemo(
    () => shelfFilter(displayRows, filter),
    [displayRows, filter]
  )
  const view = shelfWindow({ total: kept.length, pages })
  const showGrid = Boolean(rows && kept.length)
  useEffect(() => {
    if (!showGrid) return
    let frame = 0
    const node = grid.current
    if (!node) return
    const scroller = scrollParent(node)
    let previousOffset = 0
    let direction: 'up' | 'down' = 'down'
    const measure = () => {
      const columns =
        Number.parseInt(
          getComputedStyle(node).getPropertyValue('--shard-columns'),
          10
        ) || 1
      const edge = scroller === window ? null : (scroller as HTMLElement)
      const style = getComputedStyle(node)
      const pitch = shelfRowPitch({
        heights: Array.from(
          node.children,
          (child) => child.getBoundingClientRect().height
        ),
        gap: Number.parseFloat(style.rowGap),
        fallback: SHELF_ROW_PITCH,
      })
      const rootTop = edge ? edge.getBoundingClientRect().top : 0
      const gridTop = node.getBoundingClientRect().top
      const offset = Math.max(0, rootTop + SHELF_LEAD - gridTop)
      if (offset !== previousOffset)
        direction = offset > previousOffset ? 'down' : 'up'
      previousOffset = offset
      const height = edge ? edge.clientHeight : window.innerHeight
      const first = Math.floor(offset / pitch)
      const last = Math.ceil((offset + height) / pitch)
      // a transition: mounting rows is sliced between frames, never one long task
      startTransition(() =>
        setBand((prev) =>
          prev.first === first &&
          prev.last === last &&
          prev.columns === columns &&
          prev.pitch === pitch &&
          prev.direction === direction
            ? prev
            : { first, last, columns, pitch, direction }
        )
      )
    }
    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    })
    resizeObserver.observe(node)
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }
    measure()
    scroller.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      scroller.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [showGrid, filter])
  const renderWindow = shelfRenderWindow({
    // while a page loads, its skeleton rows are part of the shelf's height
    total: view.shown + (paging ? view.next : 0),
    columns: band.columns,
    rowHeight: band.pitch,
    scrollTop: band.first * band.pitch,
    viewportHeight: (band.last - band.first) * band.pitch,
    overscan: 0,
    direction: band.direction,
    directionalOverscan: 0,
  })
  const more = () => {
    if (paging || view.done) return
    freshFrom.current = view.shown
    setPaging(true)
  }
  useEffect(() => {
    if (!paging) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(
      () => {
        // one batch: the page and the end of the wait land together, or
        // the observer sees the old page and asks for one more
        setPages((n) => n + 1)
        setPaging(false)
        // once risen, a row that moves (a craft re-sorts) never rises again
        window.setTimeout(() => (freshFrom.current = Infinity), 1200)
      },
      reduce ? 0 : PAGE_MS
    )
    return () => window.clearTimeout(timer)
  }, [paging])
  // scrolling near the end brings the next page, the first few times
  const sentinel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const node = sentinel.current
    if (
      !node ||
      !view.auto ||
      paging ||
      typeof IntersectionObserver === 'undefined'
    )
      return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) more()
      },
      { rootMargin: '0px 0px 520px 0px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.auto, view.shown, paging, filter])
  const pick = (next: Filter) => {
    if (next === filter) return
    freshFrom.current = Infinity
    setFilter(next)
    setPages(1)
    setPaging(false)
  }
  const nameOf = (id: number) =>
    rows?.find((r) => r.speciesId === id)?.name ?? `#${id}`
  // one mounted live region: each new result is announced once
  const [announcement, setAnnouncement] = useState('')
  const seen = useRef<Record<number, CraftState>>({})
  const offeredCrafts = useRef(new Set<number>())
  useEffect(() => {
    for (const [id, state] of Object.entries(states)) {
      if (seen.current[Number(id)] === state) continue
      seen.current[Number(id)] = state
      if (
        state.kind === 'success' &&
        state.origin === 'user' &&
        !offeredCrafts.current.has(Number(id))
      ) {
        offeredCrafts.current.add(Number(id))
        setHeldOrder((held) => held ?? rows ?? [])
        setOfferTrade((current) => current ?? Number(id))
      }
      const name =
        rows?.find((r) => r.speciesId === Number(id))?.name ?? `#${id}`
      const text = craftMessage(name, state)
      if (text) setAnnouncement(text)
    }
  }, [states, rows])
  const tradeStates = individuals?.states
  const seenTrades = useRef<Record<number, unknown>>({})
  useEffect(() => {
    for (const [id, state] of Object.entries(tradeStates ?? {})) {
      if (seenTrades.current[Number(id)] === state) continue
      seenTrades.current[Number(id)] = state
      const text = tradeMessage(nameOf(Number(id)), state)
      if (text) setAnnouncement(text)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeStates, rows])
  if (!rows && error)
    return (
      <Shelf>
        <p className="shard-banner" role="alert">
          Chưa tải được mảnh.
          <button type="button" onClick={retry}>
            Thử lại
          </button>
        </p>
      </Shelf>
    )
  if (!rows || (loading && !rows.length))
    return (
      <Shelf aria-busy="true">
        <p className="shard-live" role="status">
          Đang mở hộp hổ phách…
        </p>
        <ul className="shard-grid">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Bone key={i} />
          ))}
        </ul>
      </Shelf>
    )
  return (
    <Shelf>
      <p className="shard-live" role="status" aria-live="polite">
        {announcement}
      </p>
      {individuals?.batchSummary &&
        individuals.batchSummary.failures.length > 0 && (
          <p className="shard-banner" role="status" data-batch-summary>
            Đã đổi {individuals.batchSummary.receipts.length} Pokémon
            {individuals.batchSummary.failures.length > 0 &&
              ` · ${individuals.batchSummary.failures.length} lượt chưa xong${individuals.batchSummary.uncertain ? ' (kết quả chưa rõ)' : ''}`}
            {individuals.batchSummary.uncertain && (
              <button
                type="button"
                onClick={() =>
                  void individuals
                    .retryMany(individuals.batchSummary!.speciesId)
                    ?.catch(() => {})
                }
              >
                Kiểm tra lại lượt cuối
              </button>
            )}
            <button type="button" onClick={individuals.dismissBatchSummary}>
              Đóng
            </button>
          </p>
        )}
      {(error || pending > 0) && (
        <p className="shard-banner" role="status">
          {error
            ? 'Chưa xác nhận được một số mảnh.'
            : `${pending} mảnh đang được xác nhận (chưa tính vào số đã có).`}
          <button type="button" onClick={retry}>
            Thử lại
          </button>
        </p>
      )}
      {rows.length ? (
        <>
          <div className="shelf-bar">
            <div
              className="shelf-filters"
              role="group"
              aria-label="Lọc mảnh và hổ phách"
            >
              {FILTERS.map(([key, label, short]) => (
                <button
                  key={key}
                  type="button"
                  data-shelf-filter={key}
                  aria-pressed={filter === key}
                  onClick={() => pick(key)}
                >
                  <b data-short={short}>{label}</b> <span>{counts[key]}</span>
                </button>
              ))}
            </div>
            {counts.stones > 0 && (
              <span className="shelf-stones">
                <b>{counts.stones}</b> viên hổ phách đã ghép
              </span>
            )}
          </div>
          {kept.length ? (
            <ul
              className="shard-grid"
              aria-label="Mảnh và hổ phách Pokémon"
              aria-busy={paging || undefined}
              ref={grid}
              style={
                {
                  '--shard-top': `${renderWindow.top}px`,
                  '--shard-bottom': `${renderWindow.bottom}px`,
                } as CSSProperties
              }
            >
              {kept
                .slice(renderWindow.start, renderWindow.end)
                .map((row, offset) => {
                  const index = renderWindow.start + offset
                  return (
                    <Row
                      key={row.speciesId}
                      row={row}
                      fresh={
                        index >= freshFrom.current
                          ? index - freshFrom.current
                          : undefined
                      }
                      state={states[row.speciesId]}
                      craft={craft}
                      tradeState={individuals?.states[row.speciesId]}
                      owned={individuals?.counts[row.speciesId] ?? 0}
                      onTrade={
                        individuals?.available ? setConfirming : undefined
                      }
                      onList={setListing}
                    />
                  )
                })}
              {paging &&
                Array.from(
                  {
                    length: Math.max(
                      0,
                      renderWindow.end -
                        Math.max(renderWindow.start, view.shown)
                    ),
                  },
                  (_, i) => <Bone key={`b${i}`} />
                )}
            </ul>
          ) : (
            <p className="shelf-empty">
              {filter === 'ready'
                ? 'Chưa loài nào đủ mảnh. Trả lời đúng ở Who’s That Pokémon? để gom thêm.'
                : 'Chưa ghép viên hổ phách nào. Đủ mảnh thì nhấn “Ghép”.'}
            </p>
          )}
          <div ref={sentinel} className="shelf-sentinel" aria-hidden="true" />
          {kept.length > 0 && (
            <div className="shelf-more">
              <progress
                value={view.shown}
                max={kept.length}
                aria-label={`Đã hiện ${view.shown} trên ${kept.length} loài`}
              />
              <p role="status">
                {paging
                  ? 'Đang mang thêm hổ phách…'
                  : `${view.shown} / ${kept.length} loài`}
              </p>
              {!view.done && (
                <button
                  type="button"
                  data-shelf-more
                  aria-busy={paging || undefined}
                  onClick={more}
                >
                  {paging ? 'Đang tải…' : `Xem thêm ${view.next} loài`}
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="shard-banner">
          Chưa có mảnh nào. Trả lời đúng ở Who’s That Pokémon? để có cơ hội nhận
          mảnh của Pokémon vừa đoán.
        </p>
      )}
      {individuals && (
        <>
          <TradeDialog
            speciesId={confirming ?? offerTrade}
            name={
              (confirming ?? offerTrade) === null
                ? ''
                : nameOf(confirming ?? offerTrade!)
            }
            available={
              rows?.find((row) => row.speciesId === (confirming ?? offerTrade))
                ?.cardCount ?? 0
            }
            onCancel={() => {
              setConfirming(null)
              setOfferTrade(null)
            }}
            onConfirm={(quantity) => {
              const id = confirming ?? offerTrade
              setConfirming(null)
              setOfferTrade(null)
              const available =
                rows?.find((row) => row.speciesId === id)?.cardCount ?? 0
              if (id !== null)
                void individuals
                  .tradeMany(id, quantity, available)
                  ?.catch(() => {})
            }}
          />
          <WelcomeDialog
            receipt={
              individuals.welcome?.receipts.length === 1
                ? individuals.welcome.receipts[0]
                : null
            }
            name={
              individuals.welcome
                ? nameOf(individuals.welcome.receipts[0].speciesId)
                : ''
            }
            save={individuals.name}
            onClose={individuals.dismissWelcome}
          />
          <TradeResultDialog
            receipts={
              individuals.welcome && individuals.welcome.receipts.length > 1
                ? individuals.welcome.receipts
                : null
            }
            name={
              individuals.welcome
                ? nameOf(individuals.welcome.receipts[0].speciesId)
                : ''
            }
            onClose={individuals.dismissWelcome}
          />
          <IndividualsDialog
            speciesId={listing}
            name={listing === null ? '' : nameOf(listing)}
            onClose={() => setListing(null)}
          />
        </>
      )}
    </Shelf>
  )
}
