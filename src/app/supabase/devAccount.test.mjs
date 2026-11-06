import test from 'node:test'
import assert from 'node:assert/strict'
import { devTestAccount, DEV_TEST_EMAIL } from './devAccount.mjs'

test('the dev test email signs in without a code, in dev only', () => {
  assert.equal(DEV_TEST_EMAIL, 'abc@gmail.com')
  const account = devTestAccount(' ABC@gmail.com ', true)
  assert.equal(account?.email, 'abc@gmail.com')
  assert.ok(account?.password)
})

test('no bypass outside dev, nor for any other email', () => {
  assert.equal(devTestAccount('abc@gmail.com', false), null)
  assert.equal(devTestAccount('abcd@gmail.com', true), null)
  assert.equal(devTestAccount('', true), null)
})
