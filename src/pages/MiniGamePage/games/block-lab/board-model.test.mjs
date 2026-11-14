import test from 'node:test'
import assert from 'node:assert/strict'
import { initial, shapeCells } from './engine.mjs'
import { clearedRows, ghostRow, trackSkins, viewCells } from './board-model.mjs'

const q = Array(40).fill(1)

test('the ghost lands on the floor of an empty board', () => {
  const s = initial(q, 1)
  assert.equal(ghostRow(s), 18)
})

test('the ghost stops on settled cells', () => {
  const s = initial(q, 1)
  const cells = s.cells.slice()
  cells[19 * 10 + 4] = 2
  assert.equal(ghostRow({ ...s, cells }), 17)
})

test('viewCells lists settled, active and ghost cells inside the field', () => {
  const s = initial(q, 1)
  const cells = s.cells.slice()
  cells[199] = 3
  const v = viewCells({ ...s, cells })
  assert.deepEqual(v.settled, [{ i: 199, type: 2 }])
  assert.equal(v.active.length, 2)
  assert.ok(v.active.every(({ i }) => i >= 0 && i < 200))
  assert.equal(v.ghost.length, 4)
  assert.deepEqual(v.ghost.map(({ i }) => i).sort((a, b) => a - b), shapeCells(1, 0).map(([x, y]) => (y + 18 - 0) * 10 + 3 + x - 0).sort((a, b) => a - b).map((i) => i - 0))
})

test('clearedRows finds the rows a landing piece completes', () => {
  const cells = Array(200).fill(0)
  for (const c of [0, 1, 2, 3, 4, 5, 6, 7]) cells[190 + c] = 1
  for (const c of [0, 1, 2, 3, 4, 5, 6, 7, 8]) cells[180 + c] = 1
  const landing = [{ i: 198 }, { i: 199 }, { i: 189 }, { i: 175 }]
  assert.deepEqual(clearedRows(cells, landing), [18, 19])
  assert.deepEqual(clearedRows(cells, [{ i: 175 }]), [])
})

test('trackSkins gives landed cells their Pokémon and moves skins down with cleared rows', () => {
  const skins = Array(200).fill(0)
  skins[180] = 7
  const old = { pieces: 3, cells: Array(200).fill(0) }
  for (let c = 0; c < 8; c += 1) old.cells[190 + c] = 1
  old.cells[180] = 2
  const landing = [{ i: 198 }, { i: 199 }, { i: 188 }, { i: 189 }]
  const out = trackSkins(skins, old, { pieces: 4 }, landing, 25)
  // row 19 completed and cleared: row 18 falls into its place
  assert.equal(out[190], 7)
  assert.equal(out[198], 25)
  assert.equal(out[199], 25)
  assert.equal(out.filter(Boolean).length, 3)
  // no lock, no change
  assert.equal(trackSkins(skins, old, { pieces: 3 }, landing, 25), skins)
})
