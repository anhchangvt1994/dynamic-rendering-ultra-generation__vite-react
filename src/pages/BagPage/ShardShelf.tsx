import { useEffect, useRef, useState, type CSSProperties } from 'react'
import styled from 'styled-components'
import AmberCard from './crafting/AmberCard'
import { craftMessage } from './crafting/messages.mjs'
import type { CraftState } from './crafting/useCardCraft'
import IndividualsDialog from './individuals/IndividualsDialog'
import TradeDialog from './individuals/TradeDialog'
import WelcomeDialog from './individuals/WelcomeDialog'
import { tradeMessage } from './individuals/messages.mjs'
import type { useIndividuals } from './individuals/useIndividuals'
import type { ShardRow } from './shardStore'

// the join plays for this long, then the real (refreshed) numbers show
const JOIN_MS = 850

const Shelf = styled.div`
  display: grid;
  gap: 12px;
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
    list-style: none;
    margin: 0;
    padding: 54px 0 0;
    display: grid;
    gap: 62px 18px;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 310px), 1fr));
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
  .shard-vault-stone:first-child {
    margin-left: 0;
  }
  .shard-vault b {
    font-size: 20px;
    margin-right: 3px;
    font-variant-numeric: tabular-nums;
  }
  .shard[data-ready]:not([data-joining]) {
    animation: shard-ready 1800ms ease-in-out infinite;
  }
  @keyframes shard-ready {
    50% {
      box-shadow:
        inset 0 0 0 2px #fff0b0,
        0 0 34px rgba(255, 190, 70, 0.5);
    }
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
  .shard-skeleton {
    height: 150px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.07);
    animation: shard-pulse 1.2s ease-in-out infinite alternate;
  }
  @keyframes shard-pulse {
    to {
      opacity: 0.4;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .shard-skeleton,
    .shard[data-ready] {
      animation: none;
    }
  }
`

type Individuals = ReturnType<typeof useIndividuals>

function Row({
  row,
  state,
  craft,
  tradeState,
  owned,
  onTrade,
  onList,
}: {
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
              {Array.from({ length: Math.min(3, row.cardCount) }, (_, i) => {
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
                      arrive={last && gained}
                    />
                  </span>
                )
              })}
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
}

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
  const [listing, setListing] = useState<number | null>(null)
  const nameOf = (id: number) =>
    rows?.find((r) => r.speciesId === id)?.name ?? `#${id}`
  // one mounted live region: each new result is announced once
  const [announcement, setAnnouncement] = useState('')
  const seen = useRef<Record<number, CraftState>>({})
  useEffect(() => {
    for (const [id, state] of Object.entries(states)) {
      if (seen.current[Number(id)] === state) continue
      seen.current[Number(id)] = state
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
        <div className="shard-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="shard-skeleton" />
          ))}
        </div>
      </Shelf>
    )
  return (
    <Shelf>
      <p className="shard-live" role="status" aria-live="polite">
        {announcement}
      </p>
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
        <ul className="shard-grid" aria-label="Mảnh và hổ phách Pokémon">
          {rows.map((row) => (
            <Row
              key={row.speciesId}
              row={row}
              state={states[row.speciesId]}
              craft={craft}
              tradeState={individuals?.states[row.speciesId]}
              owned={individuals?.counts[row.speciesId] ?? 0}
              onTrade={individuals?.available ? setConfirming : undefined}
              onList={setListing}
            />
          ))}
        </ul>
      ) : (
        <p className="shard-banner">
          Chưa có mảnh nào. Trả lời đúng ở Who’s That Pokémon? để có cơ hội nhận
          mảnh của Pokémon vừa đoán.
        </p>
      )}
      {individuals && (
        <>
          <TradeDialog
            speciesId={confirming}
            name={confirming === null ? '' : nameOf(confirming)}
            onCancel={() => setConfirming(null)}
            onConfirm={() => {
              const id = confirming
              setConfirming(null)
              if (id !== null) individuals.trade(id)
            }}
          />
          <WelcomeDialog
            receipt={individuals.welcome?.receipt ?? null}
            name={
              individuals.welcome
                ? nameOf(individuals.welcome.receipt.speciesId)
                : ''
            }
            save={individuals.name}
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
