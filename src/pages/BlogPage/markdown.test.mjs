import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseMarkdown, plainText, safeUrl } from './markdown.mjs'

const types = (src) => parseMarkdown(src).map((b) => b.type)
const flat = (inline) => inline.flatMap((n) => (n.c ? [n, ...flat(n.c)] : [n]))
const firstInline = (src) => flat(parseMarkdown(src)[0].inline)

test('empty and blank bodies make no blocks', () => {
  assert.deepEqual(parseMarkdown(''), [])
  assert.deepEqual(parseMarkdown('  \n\n  '), [])
  assert.deepEqual(parseMarkdown(null), [])
})

test('headings, paragraphs, quote, rule', () => {
  assert.deepEqual(types('## A\n\n### B\n\ntext\n\n> q\n\n---'), [
    'h2',
    'h3',
    'p',
    'quote',
    'hr',
  ])
})

test('a paragraph joins its lines', () => {
  const [p] = parseMarkdown('one\ntwo')
  assert.equal(plainText([p]), 'one two')
})

test('raw HTML stays text', () => {
  const [p] = parseMarkdown('<script>alert(1)</script>')
  assert.equal(p.type, 'p')
  assert.deepEqual(p.inline, [{ t: 'text', v: '<script>alert(1)</script>' }])
})

test('unsafe links and images are dropped to text', () => {
  assert.ok(!firstInline('[x](javascript:alert(1))').some((n) => n.t === 'a'))
  assert.ok(!firstInline('[x](//evil.com)').some((n) => n.t === 'a'))
  assert.ok(!firstInline('[x]( JaVaScRiPt:1)').some((n) => n.t === 'a'))
  assert.deepEqual(
    parseMarkdown('![x](data:image/png;base64,AA)').map((b) => b.type),
    ['p']
  )
  assert.ok(
    firstInline('[x](/blogs/a)').some(
      (n) => n.t === 'a' && n.href === '/blogs/a'
    )
  )
  assert.ok(firstInline('[x](https://a.b/c)').some((n) => n.t === 'a'))
  assert.ok(firstInline('[x](mailto:a@b.c)').some((n) => n.t === 'a'))
})

test('safeUrl by kind', () => {
  assert.equal(safeUrl('https://a.b', 'link'), 'https://a.b')
  assert.equal(safeUrl('mailto:a@b.c', 'link'), 'mailto:a@b.c')
  assert.equal(safeUrl('mailto:a@b.c', 'image'), null)
  assert.equal(safeUrl('/img/a.png', 'image'), '/img/a.png')
  assert.equal(safeUrl('//x.y/a.png', 'image'), null)
  assert.equal(safeUrl('javascript:1', 'link'), null)
  assert.equal(safeUrl('data:text/html,1', 'image'), null)
  assert.equal(safeUrl('', 'link'), null)
})

test('an image on its own line is an img block', () => {
  assert.deepEqual(parseMarkdown('![Pikachu](https://a.b/p.png)'), [
    { type: 'img', alt: 'Pikachu', src: 'https://a.b/p.png' },
  ])
})

test('bold nests italic; unclosed markers stay literal', () => {
  const inline = firstInline('**bold *nested* x**')
  assert.ok(inline.some((n) => n.t === 'b'))
  assert.ok(inline.some((n) => n.t === 'i'))
  assert.deepEqual(parseMarkdown('**a')[0].inline, [{ t: 'text', v: '**a' }])
  assert.deepEqual(parseMarkdown('`a')[0].inline, [{ t: 'text', v: '`a' }])
})

test('inline code keeps its text verbatim', () => {
  const [n] = parseMarkdown('`<b>*x*</b>`')[0].inline
  assert.deepEqual(n, { t: 'code', v: '<b>*x*</b>' })
})

test('fenced code keeps every character, even unclosed', () => {
  const [c] = parseMarkdown('```js\nconst a = "<b>"\n**x**\n```')
  assert.equal(c.type, 'code')
  assert.equal(c.lang, 'js')
  assert.equal(c.text, 'const a = "<b>"\n**x**')
  assert.equal(parseMarkdown('```\nabc')[0].text, 'abc')
})

test('lists', () => {
  const [ul] = parseMarkdown('- a\n- **b**\n* c')
  assert.equal(ul.type, 'ul')
  assert.equal(ul.items.length, 3)
  const [ol] = parseMarkdown('1. a\n2. b')
  assert.equal(ol.type, 'ol')
  assert.equal(ol.items.length, 2)
})

test('a 5000-character line and pathological markers do not hang', () => {
  const started = Date.now()
  parseMarkdown('a'.repeat(5000))
  parseMarkdown('*'.repeat(5000))
  parseMarkdown('['.repeat(3000) + '](x)')
  parseMarkdown('`'.repeat(5000))
  parseMarkdown('**a *b '.repeat(800))
  assert.ok(Date.now() - started < 1500)
})

test('plainText strips markup and caps length', () => {
  const blocks = parseMarkdown('## Title\n\n**bold** and [link](/a) `code`')
  assert.equal(plainText(blocks), 'Title bold and link code')
  assert.ok(plainText(blocks, 6).length <= 7)
})
