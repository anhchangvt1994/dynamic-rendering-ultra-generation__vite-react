import { validOperation, validSpecies } from './snapshot.mjs'

/** Pending is not a zero draw. Only awarded receipts contain spendable shards. */
export function parseChestReceipt(value) {
  if (
    !value ||
    !(
      validOperation(value.roundId) ||
      (typeof value.roundId === 'string' &&
        /^local-\d+-\d+$/.test(value.roundId))
    ) ||
    !['combo', 'special'].includes(value.kind) ||
    !['pending', 'awarded'].includes(value.state) ||
    !Array.isArray(value.shards) ||
    value.shards.length > 3
  )
    throw new TypeError('invalid_chest_receipt')
  const seen = new Set()
  let total = 0
  for (const row of value.shards) {
    if (
      !validSpecies(row?.speciesId) ||
      seen.has(row.speciesId) ||
      !Number.isInteger(row.count) ||
      row.count < 1 ||
      row.count > 3
    )
      throw new TypeError('invalid_chest_receipt')
    seen.add(row.speciesId)
    total += row.count
  }
  if (total > 3 || (value.state === 'pending' && total !== 0))
    throw new TypeError('invalid_chest_receipt')
  return {
    roundId: value.roundId,
    kind: value.kind,
    state: value.state,
    shards: value.shards.map(({ speciesId, count }) => ({ speciesId, count })),
  }
}
