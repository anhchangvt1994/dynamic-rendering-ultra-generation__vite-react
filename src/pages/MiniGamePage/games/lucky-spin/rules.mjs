const fail = (code) => {
  throw new Error(code)
}

export function chooseOutcome(random) {
  const value = random()
  if (!Number.isFinite(value) || value < 0 || value >= 1) fail('bad_random')
  return value < 0.8 ? 'common' : value < 0.97 ? 'uncommon' : 'rare'
}

export function rewardFor(outcome) {
  if (outcome === 'common') return { xp: 1, items: [] }
  if (outcome === 'uncommon') return { xp: 2, items: ['oran-berry'] }
  if (outcome === 'rare') return { xp: 3, items: ['oran-berry', 'oran-berry'] }
  fail('bad_outcome')
}
