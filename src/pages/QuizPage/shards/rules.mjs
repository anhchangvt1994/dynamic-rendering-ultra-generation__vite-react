// Shard rules (spec 2026-11-04-pokemon-shard-rewards-design). Pure, numeric,
// unrounded until display. R rarity, P power, D combined difficulty.
const FLOOR = { legendary: 0.9, mythical: 0.95 }
const EPS = 1e-9

const fail = (message) => {
  throw new TypeError(`shardRule: ${message}`)
}

export const requiredShards = (d) => 3 + Math.floor(17 * d + 0.5 + EPS)

export function shardRule(entry) {
  if (!entry || typeof entry !== 'object') fail('entry required')
  const { captureRate, powerLevel, legendary, mythical } = entry
  if (!Number.isInteger(captureRate) || captureRate < 1 || captureRate > 255)
    fail('captureRate must be an integer 1..255')
  if (!Number.isInteger(powerLevel) || powerLevel < 0 || powerLevel > 9)
    fail('powerLevel must be an integer 0..9')
  if (typeof legendary !== 'boolean' || typeof mythical !== 'boolean')
    fail('legendary/mythical must be boolean')
  const base = Math.min(Math.max((255 - captureRate) / 254, 0), 1)
  const r = Math.max(
    base,
    mythical ? FLOOR.mythical : 0,
    legendary ? FLOOR.legendary : 0
  )
  const p = powerLevel / 9
  const d = 0.55 * r + 0.3 * p + 0.15 * (r * p)
  return { r, p, d, required: requiredShards(d), drop: 1 - 0.9 * d }
}

export function winsShard(roll, drop) {
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1)
    throw new RangeError('winsShard: roll must be in [0,1)')
  if (!Number.isFinite(drop) || drop < 0 || drop > 1)
    throw new RangeError('winsShard: drop must be in [0,1]')
  return roll < drop
}
