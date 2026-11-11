import test from 'node:test'
import assert from 'node:assert/strict'
import { ticketStates } from './tickets.mjs'

test('2 of 3', () => assert.deepEqual(ticketStates(2, 3), ['ready', 'ready', 'torn']))
test('negative -> all torn', () => assert.deepEqual(ticketStates(-1, 3), ['torn', 'torn', 'torn']))
test('over -> all ready', () => assert.deepEqual(ticketStates(9, 3), ['ready', 'ready', 'ready']))
test('NaN -> all torn', () => assert.deepEqual(ticketStates(NaN, 3), ['torn', 'torn', 'torn']))
test('empty', () => assert.deepEqual(ticketStates(0, 0), []))
