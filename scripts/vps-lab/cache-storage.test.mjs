import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import test from 'node:test'
import { transform } from 'sucrase'
const require = createRequire(import.meta.url)
function load(file, deps) {
  const filename = path.resolve(file),
    module = { exports: {} }
  vm.runInNewContext(
    transform(fs.readFileSync(filename, 'utf8'), {
      transforms: ['typescript', 'imports'],
    }).code,
    {
      module,
      exports: module.exports,
      __dirname: path.dirname(filename),
      Buffer,
      URL,
      console,
      require: (name) => deps[name] ?? require(name),
    }
  )
  return module.exports
}
const silent = { log() {}, error() {} }
test('pages/views writes create missing parents and recreate directories removed after startup', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-html-'))
  try {
    const api = load('server/src/puppeteer-ssr/utils/Cache.worker/utils.ts', {
      '../../../server.config': { routes: {}, crawl: { cache: {} } },
      '../../../constants': { BROTLI_OPTIONS: {} },
      '../../../utils/ConsoleHandler': silent,
    })
    for (const name of ['pages', 'views']) {
      const root = path.join(dir, 'nested', name),
        url = 'https://example.com/' + name
      await api.set(url, root, { html: '<html>first</html>' })
      assert.ok(fs.existsSync(path.join(root, 'info', api.getKey(url) + '.txt')))
      assert.ok(fs.existsSync(path.join(root, api.getKey(url) + '.br')))
      fs.rmSync(root, { recursive: true })
      await api.get(url, root)
      assert.ok(
        fs.existsSync(path.join(root, 'info', api.getKey(url) + '.txt'))
      )
      await api.set(url, root, { html: '<html>second</html>' })
      assert.ok(fs.statSync(path.join(root, api.getKey(url) + '.br')).size > 0)
      await api.renew(url, root)
      await api.set(url, root, { html: '<html>fallback</html>', isRaw: true })
      await api.rename(url, root, {})
      assert.deepEqual(fs.readdirSync(root).filter(name => name.endsWith('.br')), [api.getKey(url) + '.br'])
      fs.rmSync(root, { recursive: true })
      await api.set(url, root, { html: '<html>after cleanup</html>' })
      assert.ok(fs.existsSync(path.join(root, 'info', api.getKey(url) + '.txt')))
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
test('data/store writes recover after cache directories are deleted', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-api-'))
  try {
    const data = path.join(dir, 'nested/data'),
      store = path.join(dir, 'nested/store')
    const api = load('server/src/api/utils/CacheManager/utils.ts', {
      '../../../utils/ConsoleHandler': silent,
      '../../../utils/PathHandler': {
        getDataPath: () => data,
        getStorePath: () => store,
      },
      '../../../constants': { BROTLI_OPTIONS: {} },
    })
    for (const root of [data, store]) {
      fs.rmSync(root, { recursive: true, force: true })
      await api.set(root, 'key', 'json', '{"ok":true}', { isCompress: false })
      assert.equal(
        fs.readFileSync(path.join(root, 'key.json'), 'utf8'),
        '{"ok":true}'
      )
      fs.rmSync(root, { recursive: true })
      await api.get(root, 'next', 'json', {
        autoCreateIfEmpty: { enable: true },
      })
      assert.ok(fs.existsSync(path.join(root, 'next.json')))
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
test('shared JSON/text writers recursively create missing parents', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-shared-'))
  try {
    const api = load('server/src/utils/FileHandler/index.ts', {
      '../ConsoleHandler': silent,
    })
    api.setJsonData(path.join(dir, 'a/b/item.json'), { ok: true })
    api.setTextData(path.join(dir, 'c/d/item.txt'), 'ready')
    assert.equal(
      fs.readFileSync(path.join(dir, 'c/d/item.txt'), 'utf8'),
      'ready'
    )
    assert.equal(
      JSON.parse(fs.readFileSync(path.join(dir, 'a/b/item.json'), 'utf8')).ok,
      true
    )
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
