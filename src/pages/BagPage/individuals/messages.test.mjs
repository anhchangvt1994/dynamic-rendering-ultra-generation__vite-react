import assert from 'node:assert/strict'
import { test } from 'node:test'
import { nameError, tradeMessage } from './messages.mjs'

test('tradeMessage: nothing without a state; one line per kind', () => {
  assert.equal(tradeMessage('Pikachu', undefined), null)
  assert.match(tradeMessage('Pikachu', { kind: 'submitting' }), /Đang đổi/)
  assert.match(
    tradeMessage('Pikachu', { kind: 'success', receipt: { cardCount: 2 } }),
    /Đã đổi hổ phách Pikachu.*còn 2 viên hổ phách/
  )
  assert.match(
    tradeMessage('Pikachu', { kind: 'uncertain' }),
    /Chưa biết kết quả/
  )
})
test('tradeMessage: refusals are named, never silent', () => {
  for (const code of [
    'insufficient_cards',
    'storage_blocked',
    'pending_unreadable',
    'trade_unavailable',
    'operation_conflict',
    'journal_corrupt',
    'something_else',
  ])
    assert.ok(
      tradeMessage('Pikachu', { kind: 'error', code }).length > 10,
      code
    )
  assert.match(
    tradeMessage('Pikachu', { kind: 'error', code: 'insufficient_cards' }),
    /Không đủ hổ phách/
  )
})
test('nameError', () => {
  assert.match(nameError('invalid_nickname'), /16 ký tự/)
  assert.match(nameError('not_found'), /Không tìm thấy/)
  assert.match(nameError('boom'), /thử lại/)
})
