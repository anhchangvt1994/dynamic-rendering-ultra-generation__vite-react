import assert from 'node:assert/strict'
import test from 'node:test'
import { loadMemoryImage, memoryArtworkCandidates, preloadMemoryArtwork } from './preload.mjs'

test('preload candidates are a small unique sample across the Pokédex', () => {
  const ids = memoryArtworkCandidates()

  assert.equal(ids.length, 24)
  assert.equal(new Set(ids).size, ids.length)
  assert.ok(ids.every((id) => Number.isInteger(id) && id >= 1 && id <= 1025))
  assert.ok(ids.at(-1) > 900)
})

test('preload waits for candidate images but always yields after timeout', async () => {
  const images = []
  class FakeImage {
    constructor() {
      images.push(this)
    }
    set src(value) {
      this.url = value
    }
  }
  const started = Date.now()
  const ready = preloadMemoryArtwork({
    ImageClass: FakeImage,
    candidates: [4, 9],
    timeoutMs: 20,
    getSrc: (id) => `/art/${id}.png`,
  })

  assert.deepEqual(images.map((image) => image.url), ['/art/4.png', '/art/9.png'])
  images[0].onload()
  await ready
  assert.ok(Date.now() - started < 250)
})

test('revealed image reports ready only after it loads', async () => {
  let image
  class FakeImage {
    constructor() { image = this }
    decode() { return new Promise((resolve) => { this.decoded = resolve }) }
    set src(value) { this.url = value }
  }
  const loaded = loadMemoryImage(25, { ImageClass: FakeImage, getSrc: (id) => `/art/${id}.png` })
  assert.equal(image.url, '/art/25.png')
  image.onload()
  image.decoded()
  assert.equal(await loaded, true)
})
