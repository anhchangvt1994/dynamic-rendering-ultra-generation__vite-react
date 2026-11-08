import { readFileSync } from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'

const styles = readFileSync(new URL('./styles.tsx', import.meta.url), 'utf8')
const pocketRules = styles.match(/\.pockets\s*\{[^}]*\}/)?.[0] ?? ''
const labelRules = styles.match(/\.tag-label\s*\{[^}]*\}/)?.[0] ?? ''

test('pocket tabs use eight columns and hide labels by default', () => {
  assert.match(pocketRules, /display:\s*grid/)
  assert.match(
    pocketRules,
    /grid-template-columns:\s*repeat\(8, minmax\(0, 1fr\)\)/
  )
  assert.match(labelRules, /display:\s*none/)
})

test('tabs hide text labels at every viewport width', () => {
  assert.doesNotMatch(styles, /\.tag-label\s*\{[^}]*display:\s*block/)
  assert.match(styles, /\.tag-label\s*\{\s*display:\s*none/)
})

test('desktop tab icon is centered across the card, independent of the count badge', () => {
  const desktopRules =
    styles.match(/@media \(min-width: 1024px\)\s*\{([\s\S]*?)\n  \}/)?.[1] ?? ''
  assert.match(desktopRules, /\.tag-card\s*\{[^}]*grid-template-columns:\s*1fr/)
  assert.match(desktopRules, /\.tag-card\s*\{[^}]*justify-items:\s*center/)
})

test('compact pocket tabs keep a narrow gap on very small screens', () => {
  const compactRules =
    styles.match(/@media \(max-width: 359px\)\s*\{([\s\S]*?)\n  \}/)?.[1] ?? ''
  assert.match(compactRules, /\.pockets\s*\{\s*gap:\s*3px;/)
})
