import test from 'node:test'
import assert from 'node:assert/strict'
import { squareCrop, fitsAvatar, AVATAR_PX } from './avatarImage.mjs'

test('squareCrop takes the largest centred square at zoom 1', () => {
  assert.deepEqual(squareCrop({ w: 400, h: 200 }), { sx: 100, sy: 0, side: 200 })
  assert.deepEqual(squareCrop({ w: 200, h: 400 }), { sx: 0, sy: 100, side: 200 })
})
test('squareCrop zooms in and follows the focus, never leaving the picture', () => {
  assert.deepEqual(squareCrop({ w: 400, h: 400, zoom: 2, cx: 0.5, cy: 0.5 }), { sx: 100, sy: 100, side: 200 })
  assert.deepEqual(squareCrop({ w: 400, h: 400, zoom: 2, cx: 0, cy: 1 }), { sx: 0, sy: 200, side: 200 })
  assert.equal(squareCrop({ w: 400, h: 400, zoom: 0.2 }).side, 400)
})
test('fitsAvatar accepts small images and refuses others', () => {
  assert.equal(fitsAvatar('data:image/webp;base64,AAAA'), true)
  assert.equal(fitsAvatar('data:image/gif;base64,AAAA'), false)
  assert.equal(fitsAvatar('data:image/webp;base64,' + 'A'.repeat(100000)), false)
  assert.equal(AVATAR_PX, 256)
})
