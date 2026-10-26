import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const helper = fileURLToPath(new URL('./network-profile.sh', import.meta.url))
const bufferMax = (ramKiB) =>
  Number(execFileSync('bash', [helper, String(ramKiB)], { encoding: 'utf8' }).trim())

test('network buffer ceiling has a safe floor for small VPS RAM', () => {
  assert.equal(bufferMax(512 * 1024), 4 * 1024 * 1024)
})

test('network buffer ceiling scales with RAM and stops at 32 MiB', () => {
  assert.equal(bufferMax(2 * 1024 * 1024), 16 * 1024 * 1024)
  assert.equal(bufferMax(16 * 1024 * 1024), 32 * 1024 * 1024)
})

