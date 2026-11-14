import test from 'node:test'
import assert from 'node:assert/strict'
import {
  TEAMS_MAX, NAME_MAX, cleanName, normalizeTeams, addTeam, removeTeam,
  toggleMember, renameTeam, membership, activeOf, putAt,
} from './teams.mjs'

const t = (slot, members = [], name = `Đội ${slot}`) => ({ slot, name, members })

test('limits', () => {
  assert.equal(TEAMS_MAX, 10)
  assert.equal(NAME_MAX, 20)
})
test('cleanName trims, collapses spaces, cuts and falls back to "Đội N"', () => {
  assert.equal(cleanName('  Đội   Lửa  ', 2), 'Đội Lửa')
  assert.equal(cleanName('   ', 3), 'Đội 3')
  assert.equal(cleanName('x'.repeat(40), 1), 'x'.repeat(NAME_MAX))
})
test('normalizeTeams sorts, and a player with no rows gets team 1 from the legacy team', () => {
  assert.deepEqual(normalizeTeams([t(3), t(1)]).map((x) => x.slot), [1, 3])
  assert.deepEqual(normalizeTeams([], ['a']), [t(1, ['a'])])
  assert.deepEqual(normalizeTeams(null, []), [t(1)])
})
test('addTeam takes the lowest free slot and stops at ten', () => {
  assert.deepEqual(addTeam([t(1), t(3)]).map((x) => x.slot), [1, 2, 3])
  const full = Array.from({ length: 10 }, (_, i) => t(i + 1))
  assert.equal(addTeam(full), null)
})
test('removeTeam keeps at least one team', () => {
  assert.deepEqual(removeTeam([t(1), t(2)], 1).map((x) => x.slot), [2])
  assert.equal(removeTeam([t(1)], 1).length, 1)
})
test('toggleMember adds, removes and respects the slot limit', () => {
  let teams = [t(1), t(2)]
  teams = toggleMember(teams, 1, 'a', 2)
  teams = toggleMember(teams, 1, 'b', 2)
  assert.deepEqual(teams[0].members, ['a', 'b'])
  assert.deepEqual(toggleMember(teams, 1, 'c', 2)[0].members, ['a', 'b'])
  assert.deepEqual(toggleMember(teams, 1, 'a', 2)[0].members, [null, 'b'])
  assert.deepEqual(toggleMember(teams, 2, 'a', 2)[1].members, ['a'], 'a Pokémon can be in several teams')
})
test('membership lists the teams a Pokémon is in', () => {
  assert.deepEqual(membership([t(1, ['a']), t(2), t(4, ['a', 'b'])], 'a'), [1, 4])
})
test('renameTeam cleans the name', () => {
  assert.equal(renameTeam([t(1)], 1, '  Lửa ')[0].name, 'Lửa')
  assert.equal(renameTeam([t(1)], 1, '')[0].name, 'Đội 1')
})
test('activeOf falls back to the first team when the active one is gone', () => {
  assert.equal(activeOf([t(2), t(5)], 5), 5)
  assert.equal(activeOf([t(2), t(5)], 1), 2)
  assert.equal(activeOf([t(2)], null), 2)
})

import { reorderMember, moveToTeam, countOf } from './teams.mjs'
test('reorderMember swaps with a filled slot and moves to the exact empty slot', () => {
  const teams = [t(1, ['a', 'b', 'c'])]
  assert.deepEqual(reorderMember(teams, 1, 0, 2)[0].members, ['c', 'b', 'a'])
  assert.deepEqual(reorderMember(teams, 1, 0, 5)[0].members, [null, 'b', 'c', null, null, 'a'].slice(0, 6))
  assert.equal(reorderMember(teams, 1, 1, 1), teams)
  assert.equal(reorderMember(teams, 1, 7, 0), teams)
})
test('removing a member leaves a hole; later ones keep their place', () => {
  const teams = toggleMember([t(1, ['a', 'b', 'c'])], 1, 'a', 6)
  assert.deepEqual(teams[0].members, [null, 'b', 'c'])
  assert.deepEqual(toggleMember(teams, 1, 'c', 6)[0].members, [null, 'b'], 'trailing holes are trimmed')
})
test('a new member takes the first hole', () => {
  const teams = [t(1, [null, 'b', null, 'd'])]
  assert.deepEqual(toggleMember(teams, 1, 'x', 4)[0].members, ['x', 'b', null, 'd'])
  assert.deepEqual(toggleMember([t(1, ['a', 'b'])], 1, 'x', 4)[0].members, ['a', 'b', 'x'])
  assert.equal(toggleMember([t(1, ['a', 'b'])], 1, 'x', 2)[0].members.length, 2, 'full stays full')
})
test('moveToTeam leaves a hole behind and fills the first hole there', () => {
  const teams = [t(1, ['a', 'b', 'c']), t(2, [null, 'z']), t(3, ['a'])]
  assert.deepEqual(moveToTeam(teams, 1, 2, 'b', 3).map((x) => x.members), [['a', null, 'c'], ['b', 'z'], ['a']])
  assert.equal(moveToTeam(teams, 1, 3, 'a', 3), teams)
  const full = [t(1, ['a']), t(2, ['x', 'y'])]
  assert.equal(moveToTeam(full, 1, 2, 'a', 2), full, 'a full target refuses')
})
test('countOf counts Pokémon, not holes', () => {
  assert.equal(countOf(t(1, [null, 'b', null, 'd'])), 2)
})

test('putAt drops a Pokémon on the exact slot, not the first hole', () => {
  const ts = [t(1, ['a'])]
  assert.deepEqual(putAt(ts, 1, 'b', 2, 4)[0].members, ['a', null, 'b'])
  assert.deepEqual(putAt(ts, 1, 'a', 2, 4), ts)
  assert.deepEqual(putAt(ts, 1, 'b', 4, 4), ts)
})
