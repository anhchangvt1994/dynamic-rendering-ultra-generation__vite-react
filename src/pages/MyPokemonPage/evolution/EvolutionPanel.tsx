import type { Individual } from 'pages/BagPage/individuals/client'
import { ITEMS } from 'pages/QuizPage/items.mjs'
import { randomId } from 'utils/secure.mjs'
import { titleCase } from '../build/format.mjs'
import EvoArt from './EvoArt'
import { openEvolution } from './evolutionStore'
import { branchProgress, promptBranches } from './format.mjs'
import { EvolutionPanelStyle } from './styles'
import type { useEvolution } from './useEvolution'
import { useSpeciesNames } from './useSpeciesNames'

const itemName = (id: string) =>
  (ITEMS as { id: string; name: string }[]).find((i) => i.id === id)?.name ??
  titleCase(id)

type Props = { item: Individual; api: ReturnType<typeof useEvolution> }

/** Profile card: what is left before each branch, stones to use, the button when one is ready. */
export default function EvolutionPanel({ item, api }: Props) {
  const nameOf = useSpeciesNames()
  const { options, status, ready, items, busy, error, retry } = api
  const head = (
    <h2 id="rm-h-evolve">Tiến hoá</h2>
  )
  if (status === 'unavailable')
    return (
      <EvolutionPanelStyle className="rm-card" aria-labelledby="rm-h-evolve">
        {head}
        <p className="rm-muted">Đăng nhập để xem hướng tiến hoá.</p>
      </EvolutionPanelStyle>
    )
  if (!options)
    return (
      <EvolutionPanelStyle
        className="rm-card"
        aria-labelledby="rm-h-evolve"
        aria-busy={status === 'loading'}
      >
        {head}
        {status === 'error' ? (
          <p className="rm-muted" role="alert">
            {error}{' '}
            <button type="button" className="rm-btn" onClick={retry}>
              Thử lại
            </button>
          </p>
        ) : (
          <p className="rm-muted" role="status">
            Đang tải…
          </p>
        )}
      </EvolutionPanelStyle>
    )
  if (!options.branches.length)
    return (
      <EvolutionPanelStyle className="rm-card" aria-labelledby="rm-h-evolve">
        {head}
        <p className="rm-muted">{nameOf(options.species)} không tiến hoá.</p>
      </EvolutionPanelStyle>
    )

  const unmet = promptBranches(options).filter((b) => !b.ready)
  const stones = new Map<string, number[]>()
  for (const s of items)
    if (s.owned > 0) stones.set(s.item, [...(stones.get(s.item) ?? []), s.to])
  const open = (request: object) =>
    openEvolution({
      id: randomId(),
      individualId: item.id,
      ...request,
    } as Parameters<typeof openEvolution>[0])

  return (
    <EvolutionPanelStyle className="rm-card" aria-labelledby="rm-h-evolve">
      {head}
      <ul className="evp-list">
        {ready.length > 0 && (
          <li className="evp-tile">
            <EvoArt id={ready[0].to} className="evp-art" data-ready />
            <b className="evp-name">
              {ready.map((b) => nameOf(b.to)).join(' · ')}
            </b>
            <span className="evp-acts">
              <button
                type="button"
                className="rm-btn rm-primary"
                data-primary
                data-action="evolve"
                aria-disabled={busy || undefined}
                onClick={() => open({ kind: 'prompt' })}
              >
                Tiến hoá
              </button>
            </span>
          </li>
        )}
        {[...stones].map(([stone, targets]) => (
          <li key={stone} className="evp-tile">
            <EvoArt id={targets[0]} className="evp-art" data-ready />
            <b className="evp-name">
              {targets.map(nameOf).join(' · ')}
            </b>
            <span className="evp-acts">
              <button
                type="button"
                className="rm-btn rm-primary"
                data-primary
                data-action="use-stone"
                aria-disabled={busy || undefined}
                onClick={() =>
                  targets.length === 1
                    ? open({ kind: 'run', item: stone, branch: targets[0] })
                    : open({ kind: 'prompt', item: stone })
                }
              >
                Dùng {itemName(stone)}
              </button>
            </span>
          </li>
        ))}
        {unmet.map((b) => {
          const raw = options.branches.find((x: any) => x.to === b.to)
          const progress = raw ? branchProgress(raw) : null
          const left = progress ? Math.max(0, progress.need - progress.have) : 0
          return (
            <li key={b.to} className="evp-tile" data-branch={b.to}>
              <EvoArt id={b.to} className="evp-art" />
              <b className="evp-name">{nameOf(b.to)}</b>
              <ul className="evp-reasons">
                {b.lines.map((l, i) => (
                  <li key={i} data-ok={l.ok || undefined}>
                    {l.text}
                  </li>
                ))}
              </ul>
              {progress && (
                <>
                  <div
                    className="evp-bar"
                    role="progressbar"
                    aria-label={`Tiến độ cấp để tiến hoá thành ${nameOf(b.to)}`}
                    aria-valuemin={0}
                    aria-valuemax={progress.need}
                    aria-valuenow={Math.min(progress.have, progress.need)}
                  >
                    <i
                      style={{
                        width: `${Math.min(100, (progress.have / progress.need) * 100)}%`,
                      }}
                    />
                  </div>
                  {left > 0 && <p className="evp-more">Còn {left} cấp nữa</p>}
                </>
              )}
            </li>
          )
        })}
      </ul>
      {error && (
        <p className="evp-err" role="alert">
          {error}
        </p>
      )}
    </EvolutionPanelStyle>
  )
}
