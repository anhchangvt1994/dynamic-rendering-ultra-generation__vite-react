// A shard receipt from the database, checked: anything else is not shown.
const STATES = ['pending', 'awarded', 'not_awarded', 'ineligible']
const nullableNumber = (value) =>
  value === null || (typeof value === 'number' && Number.isFinite(value))

export function parseReceipt(data) {
  const ok =
    data &&
    typeof data === 'object' &&
    typeof data.roundId === 'string' &&
    Number.isInteger(data.speciesId) &&
    data.speciesId >= 1 &&
    data.speciesId <= 1025 &&
    STATES.includes(data.state) &&
    Number.isInteger(data.count) &&
    data.count >= 0 &&
    nullableNumber(data.required) &&
    nullableNumber(data.drop)
  if (!ok) throw new Error('bad_receipt')
  return {
    roundId: data.roundId,
    speciesId: data.speciesId,
    state: data.state,
    count: data.count,
    required: data.required,
    drop: data.drop,
  }
}
