import assert from 'node:assert/strict'
import { test } from 'node:test'
import { craftMessage } from './messages.mjs'

const receipt = { shardCount: 2, cardCount: 3 }
test('each craft state says what happened, and idle says nothing', () => {
  assert.equal(craftMessage('mewtwo', undefined), null)
  assert.match(
    craftMessage('mewtwo', { kind: 'submitting' }),
    /Đang ghép hổ phách mewtwo/
  )
  assert.match(
    craftMessage('mewtwo', { kind: 'success', receipt }),
    /còn 2 mảnh, có 3 viên hổ phách/
  )
  assert.match(
    craftMessage('mewtwo', { kind: 'uncertain' }),
    /Chưa biết kết quả/
  )
  assert.match(
    craftMessage('mewtwo', { kind: 'error', code: 'insufficient_shards' }),
    /Không đủ mảnh/
  )
  assert.match(
    craftMessage('mewtwo', { kind: 'error', code: 'weird' }),
    /Không ghép được hổ phách mewtwo/
  )
})
