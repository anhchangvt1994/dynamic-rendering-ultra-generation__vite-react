import assert from 'node:assert/strict'
import test from 'node:test'
import { brotliCompressSync } from 'node:zlib'
import { spawnSync } from 'node:child_process'
import { loadOptimization, runPipeline } from './html-optimization-fixtures.mjs'

const api = loadOptimization()
const text = (html) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()

for (const method of [
  'lowOptimizeContent',
  'shallowOptimizeContent',
  'optimizeContent',
]) {
  test(`${method} preserves div word boundaries and inline text`, async () => {
    assert.equal(
      text(await api[method]('<div>thomas</div><div>edition</div>')),
      'thomas edition'
    )
    assert.equal(
      text(
        await api[method](
          'before<DIV title="a > b">one<div>two</div></DIV>after'
        )
      ),
      'before one two after'
    )
    assert.equal(
      text(
        await api[method]('<div><span>inter</span><span>national</span></div>')
      ),
      'international'
    )
    assert.equal(
      await api[method]('<divider>keep</divider>'),
      '<divider>keep</divider>'
    )
    const quotedDiv = await api[method](
      '<div title="<example>">one</div><p>two</p>'
    )
    assert.doesNotMatch(quotedDiv, /<\/?div(?=[\s>])/i)
    assert.equal(text(quotedDiv), 'one two')
  })
}

test('minification leaves exactly one space across empty icon wrappers', async () => {
  for (const icon of [
    '<i/>',
    '<i></i>',
    '<i> \n </i>',
    '<i class="fa-user"></i>',
  ]) {
    const html = `<div>thomas</div><div>${icon}</div><div>edition</div>`
    for (const method of [
      'lowOptimizeContent',
      'shallowOptimizeContent',
      'optimizeContent',
    ]) {
      // Assert the real output: the text() helper deliberately collapses spaces
      // and would hide this regression.
      assert.equal(
        await api.compressContent(await api[method](html)),
        'thomas edition',
        `${method}: ${icon}`
      )
    }
    assert.equal(await runPipeline(api, html), 'thomas edition', icon)
  }
})

test('empty icon cleanup preserves accessible attributes and protected examples', async () => {
  const html =
    '<i aria-label="Information"></i><i id="target"></i><i style="display:block"></i>'
  assert.equal(await api.lowOptimizeContent(html), html)
  const example =
    '<pre><code><i/></code></pre><script type="application/ld+json">{"example":"<i/>"}</script>'
  for (const method of [
    'lowOptimizeContent',
    'shallowOptimizeContent',
    'optimizeContent',
  ])
    assert.equal(await api[method](example), example)
})

test('raw text, comments, and quoted tag attributes are not rewritten as markup', async () => {
  const html = `<script type="application/ld+json">{"description":"<div>thomas</div><div>edition</div>","class":"keep"}</script><!-- <div>keep</div> --><pre>line 1\n  line 2</pre><p title='<div>keep</div>'>class="literal"</p>`
  for (const method of [
    'lowOptimizeContent',
    'shallowOptimizeContent',
    'optimizeContent',
  ])
    assert.equal(await api[method](html), html)
})

test('attribute normalization also leaves markup in structured data and code untouched', async () => {
  const raw = `<script type="application/ld+json">{"example":"<img alt='keep' src='/keep.png'><a href='/keep'>Click here</a>"}</script><pre><code>&lt;div&gt;  <img alt="sample" src="/sample.png"></code></pre>`
  for (const method of [
    'shallowOptimizeContent',
    'optimizeContent',
    'deepOptimizeContent',
  ])
    assert.equal(await api[method](raw), raw)
})

test('quoted markup and raw tags with quoted markup attributes remain intact', async () => {
  const html = `<p title='sample <img alt="x" src="/x">'>keep</p><script title="<example>" type="application/ld+json">{"name":"<div>keep</div>"}</script>`
  for (const method of [
    'shallowOptimizeContent',
    'optimizeContent',
    'deepOptimizeContent',
  ])
    assert.equal(await api[method](html), html)
})

test('script-only and style-only modes keep their separate removal policies', async () => {
  const script = '<script src="/app.js"></script>'
  const style = '<style>p { color: red }</style>'
  assert.equal(await api.scriptOptimizeContent(script + style), style)
  assert.equal(await api.styleOptimizeContent(script + style), script)
  assert.equal(
    await api.lowOptimizeContent(
      '<p class="remove" style="color:red">keep</p>'
    ),
    '<p style="color:red">keep</p>'
  )
})

test('void button inputs never consume adjacent paragraphs or links', async () => {
  for (const method of ['shallowOptimizeContent', 'optimizeContent']) {
    for (const input of [
      '<input type = "button" value="Save">',
      '<INPUT TYPE="submit" VALUE="Save">',
    ]) {
      const output = await api[method](
        `${input}<p>Keep</p><a href="/details">Details</a>`
      )
      assert.match(output, /<input\b/i)
      assert.match(output, /<p>Keep<\/p>/)
      assert.match(output, /Details<\/a>/)
    }
  }
})

test('SSR comment markers do not prevent normalization of outer anchors', async () => {
  assert.match(
    await api.shallowOptimizeContent('<a>Continue<!-- marker --></a>'),
    /<button\b/
  )
  const output = await api.deepOptimizeContent(
    '<a href="/details">Click here<!-- marker --></a>'
  )
  assert.equal(text(output), '/details')
})

test('interactive markup around protected code is retained without rewriting code', async () => {
  const html = '<a><code>Click here</code></a>'
  assert.equal(await api.shallowOptimizeContent(html), html)
  assert.equal(await api.deepOptimizeContent(html), html)
  const comment = '<a>Continue<!-- </a> --></a>'
  assert.equal(await api.shallowOptimizeContent(comment), comment)
})

test('attribute-heavy tags without a closing element do not stall the worker', () => {
  const script = `
    import {loadOptimization} from './scripts/vps-lab/html-optimization-fixtures.mjs';
    const api = loadOptimization();
    const html = '<form ' + 'data-x="a b c" '.repeat(100) + '>' + 'body '.repeat(10000);
    await api.optimizeContent(html);
    await api.shallowOptimizeContent(html);
    console.log('completed');
  `
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', script],
    { encoding: 'utf8', timeout: 3000 }
  )
  assert.equal(result.status, 0, result.error?.message || result.stderr)
  assert.match(result.stdout, /completed/)
})

test('script removal preserves structured data with reordered attributes and quotes', async () => {
  const keep = `<script id="schema" TYPE = 'application/ld+json'>{"name":"keep"}</script><script type=application/xml><root/></script>`
  assert.equal(
    await api.scriptOptimizeContent(
      `<script defer src="/app.js"></script>${keep}`
    ),
    keep
  )
})

test('link and media attributes only affect their own tag', async () => {
  const html =
    '<link rel="alternate" href="/feed"><link rel="stylesheet" href="/app.css"><video src="/remove.mp4">remove</video><video seo-tag="true">keep</video>'
  const output = await api.optimizeContent(html)
  assert.match(output, /<link rel="alternate" href="\/feed">/)
  assert.doesNotMatch(output, /app\.css|remove\.mp4/)
  assert.match(output, /<video seo-tag="true">keep<\/video>/)
})

test('class and style removal respects attribute boundaries and quoted values', async () => {
  const html = `<p data-class="keep" title=" class='literal'" class = 'remove' style = "color:red">class="text"</p>`
  const output = await api.optimizeContent(html)
  assert.match(output, /data-class="keep"/)
  assert.match(output, /title=" class='literal'"/)
  assert.match(output, />class="text"<\/p>/)
  assert.doesNotMatch(output, /remove|color:red/)
})

test('normalization handles ordinary and quoted-angle-bracket attributes consistently', async () => {
  const html =
    '<html lang="en"><body><img alt="Portrait" src="/p.webp"><a href="/details">Details</a></body></html>'
  for (const method of [
    'shallowOptimizeContent',
    'optimizeContent',
    'deepOptimizeContent',
  ]) {
    const expected = await api[method](html)
    const quoted = await api[method](
      html.replace('<body>', '<body data-check="a > b">')
    )
    assert.equal(quoted.replace(' data-check="a > b"', ''), expected)
    const image = await api[method]('<img alt="a > b" src="/portrait">')
    if (method !== 'deepOptimizeContent') assert.match(image, /alt="a > b"/)
  }
})

test('the complete pipeline detects icon classes before dropping classes', async () => {
  const html =
    '<html lang="en"><body><div>thomas</div><div>edition</div><span class="material-icons">home</span><img class="fa-user" alt="user" src="/icon.png"><p>keep</p></body></html>'
  const output = await runPipeline(api, html)
  assert.equal(text(output), 'thomas edition keep')
  assert.doesNotMatch(output, /home|icon\.png|material-icons|class=/)
})

test('the ISR pipeline honors script/style-only and low optimization modes', async () => {
  const script = '<script>run()</script>'
  const style = '<style>p { color:red }</style>'
  const body = '<div>thomas</div><div>edition</div>'
  const flags = {
    enableShallowOptimize: false,
    enableDeepOptimize: false,
    enableToCompress: false,
  }
  const scripts = loadOptimization(
    {},
    {},
    { ...flags, enableStyleOptimize: false }
  )
  assert.equal(await scripts.pipeline(script + style + body), style + body)
  const styles = loadOptimization(
    {},
    {},
    { ...flags, enableScriptOptimize: false }
  )
  assert.equal(await styles.pipeline(script + style + body), script + body)
  const low = loadOptimization({}, {}, { ...flags, enableLowOptimize: true })
  assert.equal(
    text(await low.pipeline(script + style + body)),
    'thomas edition'
  )
})

test('deep optimization reads link attributes before final minification', async () => {
  const output = await runPipeline(
    api,
    '<html lang="en"><body><a href="/details">Click here</a></body></html>'
  )
  assert.equal(text(output), '/details')
  assert.doesNotMatch(output, /undefined/)
})

test('Brotli input and disabled deep optimization retain their supported behavior', async () => {
  const html = '<div>thomas</div><div>edition</div>'
  assert.equal(
    text(await api.lowOptimizeContent(brotliCompressSync(Buffer.from(html)))),
    'thomas edition'
  )
  const disabled = loadOptimization({}, { DISABLE_DEEP_OPTIMIZE: true })
  assert.equal(
    await disabled.optimizeContent(`<script>remove()</script>${html}`),
    html
  )
  assert.equal(
    await disabled.optimizeContent('<p style="display:none">keep</p>'),
    '<p style="display:none">keep</p>'
  )
})
