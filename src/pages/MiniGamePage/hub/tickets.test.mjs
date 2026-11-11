import test from 'node:test'
import assert from 'node:assert/strict'
import { ticketStates, outOfTurns } from './tickets.mjs'

test('2 of 3', () => assert.deepEqual(ticketStates(2, 3), ['ready', 'ready', 'torn']))
test('negative -> all torn', () => assert.deepEqual(ticketStates(-1, 3), ['torn', 'torn', 'torn']))
test('over -> all ready', () => assert.deepEqual(ticketStates(9, 3), ['ready', 'ready', 'ready']))
test('NaN -> all torn', () => assert.deepEqual(ticketStates(NaN, 3), ['torn', 'torn', 'torn']))
test('empty', () => assert.deepEqual(ticketStates(0, 0), []))
import { boothLabel, shouldTear } from './tickets.mjs'

test('unknown turns -> all wait', () => assert.deepEqual(ticketStates(null, 3), ['wait', 'wait', 'wait']))
test('label: unknown turns is neutral, not 3/3', () => assert.equal(boothLabel({ server: true, left: null, total: 3, resetText: '' }), 'Đang tải lượt…'))
test('label: guest', () => assert.equal(boothLabel({ server: false, left: null, total: 3, resetText: '' }), 'Chơi thử, không mất lượt'))
test('label: some left', () => assert.equal(boothLabel({ server: true, left: 2, total: 3, resetText: '' }), 'Còn 2/3 lượt'))
test('label: none left', () => assert.equal(boothLabel({ server: true, left: 0, total: 3, resetText: '1 giờ' }), 'Hết lượt, thêm sau 1 giờ'))
test('tear: first data load never tears', () => assert.equal(shouldTear(null, 1), false))
test('tear: drop tears', () => assert.equal(shouldTear(3, 2), true))
test('tear: refill or same does not', () => {
  assert.equal(shouldTear(2, 3), false)
  assert.equal(shouldTear(2, 2), false)
  assert.equal(shouldTear(2, null), false)
})
test('outOfTurns: zero left blocks, an open round still resumes', () => {
  assert.equal(outOfTurns({ server: true, left: 0, hasOpen: false }), true)
  assert.equal(outOfTurns({ server: true, left: 0, hasOpen: true }), false)
  assert.equal(outOfTurns({ server: true, left: 1, hasOpen: false }), false)
  assert.equal(outOfTurns({ server: false, left: 0, hasOpen: false }), false)
})
