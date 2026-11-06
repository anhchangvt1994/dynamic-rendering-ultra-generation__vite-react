import { parseChestReceipt } from './chestReceipt.mjs'

export function startChestClaim(engine, roundId, kind, emit) {
  let live = true
  emit({ receipt: null, error: null })
  Promise.resolve()
    .then(() => engine.claimChestShards(roundId, kind))
    .then(
      (value) => {
        if (live) emit({ receipt: parseChestReceipt(value), error: null })
      },
      (error) => {
        if (live) emit({ receipt: null, error })
      }
    )
    .catch((error) => {
      if (live) emit({ receipt: null, error })
    })
  return () => {
    live = false
  }
}
