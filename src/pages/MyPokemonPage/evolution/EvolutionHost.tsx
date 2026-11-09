import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { closeEvolution, useEvolutionQueue } from './evolutionStore'
import type { EvolutionRequest } from './evolutionStore'
import EvolveDialog from './EvolveDialog'
import { defaultChoice, promptBranches, stoneGroups } from './format.mjs'
import { snoozeKey } from './queue.mjs'
import { snooze } from './snooze'
import { useEvolution, type EvolveResult } from './useEvolution'
import { useSpeciesNames } from './useSpeciesNames'

const EvolveFx = lazy(() => import('./EvolveFx'))

function Active({ request }: { request: EvolutionRequest }) {
  const api = useEvolution(request.individualId)
  const nameOf = useSpeciesNames()
  const [result, setResult] = useState<EvolveResult | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const ran = useRef('')
  const { options, evolve, error, busy } = api
  const branches = promptBranches(options, request.item ?? null)
  const ready = branches.filter((b) => b.ready)
  const stones = request.item ? [] : stoneGroups(api.items)
  const shown = result === null && (request.kind === 'prompt' || error)

  // one ready branch is chosen for the player
  useEffect(() => {
    setSelected(defaultChoice(ready))
    // the set of ready branches decides
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready.map((b) => b.to).join(',')])

  // an item was used: the confirmation is the click itself
  useEffect(() => {
    if (request.kind !== 'run' || ran.current === request.id) return
    ran.current = request.id
    evolve(request.branch ?? 0, request.item).then((r) => r && setResult(r))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.id])

  // nothing to choose and nothing went wrong: do not hold the queue
  const empty =
    result === null &&
    request.kind === 'prompt' &&
    Boolean(options) &&
    !branches.length &&
    !stones.length &&
    !error
  useEffect(() => {
    if (empty) closeEvolution()
  }, [empty])

  const later = () => {
    if (request.kind === 'prompt' && options)
      snooze(snoozeKey(request.individualId, options))
    closeEvolution()
  }

  if (result)
    return (
      <Suspense fallback={null}>
        <EvolveFx
          fromId={result.receipt.from}
          toId={result.receipt.to}
          fromName={nameOf(result.receipt.from)}
          toName={nameOf(result.receipt.to)}
          stats={result.diff?.stats ?? null}
          first={result.receipt.first}
          onDone={closeEvolution}
        />
      </Suspense>
    )
  if (!shown) return null
  const from = options?.species ?? 0
  return (
    <EvolveDialog
      open={branches.length > 0 || stones.length > 0 || Boolean(error)}
      stones={stones}
      onStone={async (item, to) => {
        const r = await evolve(to, item)
        if (r) setResult(r)
      }}
      fromId={from}
      name={nameOf(from)}
      level={options?.level ?? null}
      branches={branches}
      selected={selected}
      nameOf={nameOf}
      busy={busy}
      error={error}
      onSelect={setSelected}
      onLater={later}
      onConfirm={async () => {
        if (selected === null) return
        const r = await evolve(selected, request.item)
        if (r) setResult(r)
      }}
    />
  )
}

/** Mounted once in the layout: shows the head of the evolution queue. */
export default function EvolutionHost() {
  const queue = useEvolutionQueue()
  const head = queue[0]
  if (!head) return null
  return <Active key={head.id} request={head} />
}
