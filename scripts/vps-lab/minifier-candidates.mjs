import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import {
  htmlFixtures,
  loadOptimization,
  root,
} from './html-optimization-fixtures.mjs'

const require = createRequire(import.meta.url)
const labRequire = createRequire(
  path.join(root, '.vps-lab/minify-compare/package.json')
)

export async function minifierCandidates() {
  const current = require('@minify-html/node')
  const latest = labRequire('@minify-html/node')
  const swc = labRequire('@swc/html')
  const terser = labRequire('html-minifier-terser')
  const nano = labRequire('htmlnano')
  const nextPackage = labRequire('html-minifier-next/package.json')
  const next = await import(
    pathToFileURL(
      path.join(
        root,
        '.vps-lab/minify-compare/node_modules/html-minifier-next',
        nextPackage.exports['.'].import
      )
    ).href
  )
  const currentVersion = require('@minify-html/node/package.json').version
  const latestVersion = labRequire('@minify-html/node/package.json').version
  const api = loadOptimization()
  const native = (id, lib, version, config, reuseBuffer = false) => ({
    id,
    version,
    config,
    run: (input) =>
      lib
        .minify(reuseBuffer ? input.buffer : Buffer.from(input.html), config)
        .toString(),
  })
  const swcOptions = {
    minifyJs: false,
    minifyCss: false,
    minifyJson: false,
    collapseWhitespaces: 'conservative',
    removeComments: true,
    quotes: true,
  }
  const nanoOptions = {
    minifyJs: false,
    minifyCss: false,
    minifySvg: false,
    minifyJson: false,
    minifyHtmlTemplate: false,
    removeAttributeQuotes: false,
    removeComments: 'all',
    collapseWhitespace: 'conservative',
  }
  const terserOptions = {
    collapseWhitespace: true,
    removeComments: true,
    collapseBooleanAttributes: true,
    removeOptionalTags: true,
    removeAttributeQuotes: false,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    minifyJS: false,
    minifyCSS: false,
    sortAttributes: false,
    sortClassName: false,
  }
  const swcUnquotedOptions = { ...swcOptions, quotes: false }
  const terserConservativeOptions = {
    ...terserOptions,
    conservativeCollapse: true,
  }
  const terserUnquotedOptions = {
    ...terserConservativeOptions,
    removeAttributeQuotes: true,
  }
  const nanoUnquotedOptions = { ...nanoOptions, removeAttributeQuotes: true }
  const nextOptions = {
    collapseWhitespace: true,
    conservativeCollapse: true,
    removeComments: true,
    collapseBooleanAttributes: true,
    removeOptionalTags: true,
    removeAttributeQuotes: true,
    minifyJS: false,
    minifyCSS: false,
    minifyJSON: false,
    minifySVG: false,
    sortAttributes: false,
    sortClassNames: false,
  }
  return [
    {
      id: 'current-wrapper',
      version: currentVersion,
      config: {},
      run: (input) => api.compressContent(input.html),
    },
    native('native-current', current, currentVersion, {}),
    native('native-current-buffer', current, currentVersion, {}, true),
    native('native-current-keep-tags', current, currentVersion, {
      keep_closing_tags: true,
      keep_html_and_head_opening_tags: true,
    }),
    native('native-current-css', current, currentVersion, { minify_css: true }),
    native('native-current-js-css', current, currentVersion, {
      minify_js: true,
      minify_css: true,
    }),
    native('native-latest', latest, latestVersion, {}),
    native('native-latest-js-css', latest, latestVersion, {
      minify_js: true,
      minify_css: true,
    }),
    {
      id: 'swc-conservative',
      version: labRequire('@swc/html/package.json').version,
      config: swcOptions,
      run: (input) => swc.minifySync(input.html, swcOptions).code,
      runFragment: (input) =>
        swc.minifyFragmentSync(input.html, swcOptions).code,
    },
    {
      id: 'terser-html-only',
      version: labRequire('html-minifier-terser/package.json').version,
      config: terserOptions,
      run: (input) => terser.minify(input.html, terserOptions),
    },
    {
      id: 'swc-conservative-unquoted',
      version: labRequire('@swc/html/package.json').version,
      config: swcUnquotedOptions,
      run: (input) => swc.minifySync(input.html, swcUnquotedOptions).code,
      runFragment: (input) =>
        swc.minifyFragmentSync(input.html, swcUnquotedOptions).code,
    },
    {
      id: 'terser-conservative',
      version: labRequire('html-minifier-terser/package.json').version,
      config: terserConservativeOptions,
      run: (input) => terser.minify(input.html, terserConservativeOptions),
    },
    {
      id: 'terser-conservative-unquoted',
      version: labRequire('html-minifier-terser/package.json').version,
      config: terserUnquotedOptions,
      run: (input) => terser.minify(input.html, terserUnquotedOptions),
    },
    {
      id: 'next-conservative',
      version: nextPackage.version,
      config: nextOptions,
      run: (input) => next.minify(input.html, nextOptions),
    },
    {
      id: 'htmlnano-html-only',
      version: JSON.parse(
        fs.readFileSync(
          path.join(
            root,
            '.vps-lab/minify-compare/node_modules/htmlnano/package.json'
          )
        )
      ).version,
      config: nanoOptions,
      run: async (input) =>
        (await nano.process(input.html, nanoOptions, nano.presets.safe)).html,
    },
    {
      id: 'htmlnano-unquoted',
      version: JSON.parse(
        fs.readFileSync(
          path.join(
            root,
            '.vps-lab/minify-compare/node_modules/htmlnano/package.json'
          )
        )
      ).version,
      config: nanoUnquotedOptions,
      run: async (input) =>
        (await nano.process(input.html, nanoUnquotedOptions, nano.presets.safe))
          .html,
    },
  ]
}

export const makeInput = (html) => ({ html, buffer: Buffer.from(html) })

export async function minifierFixtures(extraFiles = []) {
  const api = loadOptimization()
  const raw = htmlFixtures(500)
  const fixtures = {
    cards: await api.shallowOptimizeContent(raw.cards, true),
    media: await api.shallowOptimizeContent(raw.media, true),
    raw_js_css: `<!doctype html><html><head><style>${Array.from({ length: 40 }, (_, i) => `.item-${i} { color: rgb(255, 0, 0); margin: 0px 0px 0px 0px; padding: 12px; }`).join('\n')}</style><script>function calculate(value) { const factor = 2; return value * factor + 0; } window.result = calculate(21);</script></head><body>${raw.cards.slice(raw.cards.indexOf('<body>') + 6, raw.cards.lastIndexOf('</body>'))}</body></html>`,
  }
  for (const file of extraFiles) {
    const html = fs.readFileSync(file, 'utf8')
    fixtures[path.basename(file)] = await api.shallowOptimizeContent(html, true)
  }
  return Object.fromEntries(
    Object.entries(fixtures).map(([name, html]) => [name, makeInput(html)])
  )
}

export const qualityFixtures = {
  inline_text:
    '<!doctype html><html><body><p>thomas <span>edition</span></p><p><b>inter</b><em>national</em></p></body></html>',
  pre_json: `<!doctype html><html><head><script type="application/ld+json">{"name":"thomas edition","example":"<div>x</div>","spacing":"a  b"}</script></head><body><pre><code>line 1\n  line 2\n\n    line 3</code></pre><textarea> a  b\n c </textarea></body></html>`,
  attributes_svg:
    '<!doctype html><html lang="vi"><body><a href="/details?a=1&amp;b=2" title="a > b">Details</a><img alt="a > b" src="/portrait.png"><input type="text" value="a  b"><input type="checkbox" checked disabled><svg viewBox="0 0 10 10"><path d="M0 0 L10 10"/></svg></body></html>',
  inline_layout:
    '<!doctype html><html><head><style>.inline > div { display:inline; }</style></head><body><div class="inline"><div>thomas</div> <div>edition</div></div></body></html>',
  scripts:
    '<!doctype html><html><head><script>window.answer = 20 + 22;</script><script>window.answer += 1;</script></head><body><button onclick="window.clicked = (window.clicked || 0) + 1">Run</button></body></html>',
}
