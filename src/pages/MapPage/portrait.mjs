import { CLASSES } from './npc.mjs'

const HAIR = ['#2b1d16', '#5a3820', '#8a5a2b', '#c98a3c', '#f0c75a', '#d8d2c4', '#a8321e', '#e0568a', '#3a6ad8', '#2fb98a', '#7a4ac8', '#222a44']
const SKIN = ['#ffe0c4', '#f7c9a0', '#e8aa7c', '#c98a5c', '#a56a42', '#7a4a2c', '#f2d8c8', '#d6a0a0']
const OUTFIT = ['#3b6cc8', '#c8453b', '#3fa86a', '#8a5ac8', '#e09a2b', '#2f8aa8', '#d85a8a', '#5a6a78', '#7a5a3a', '#20243a', '#a8c83b', '#e8e8f0']
const ACCENT = ['#ffcf5a', '#ff6b8a', '#5fe3b4', '#8fd4ff', '#ffffff', '#ff9a4a', '#b89aff', '#3a3a4a', '#a8e84a', '#ff4a4a', '#4af0f0', '#f0a8ff']
const INK = '#1e1830'

const at = (list, i) => list[((i % list.length) + list.length) % list.length]
const circle = (x, y, r, fill, extra = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${extra}/>`
const path = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`
const outline = `stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"`

// hair: [back layer, front layer]; head centre (48, 46), radius 20
const HAIRS = [
  (c) => ['', path('M27 44 Q28 22 48 22 Q68 22 69 44 Q58 34 48 36 Q38 34 27 44Z', c, outline)],
  (c) => ['', path('M27 44 L26 26 L35 33 L38 20 L46 31 L52 18 L58 31 L66 22 L67 34 L70 44 Q58 34 48 36 Q38 34 27 44Z', c, outline)],
  (c) => [path('M26 44 Q24 76 34 82 L62 82 Q72 76 70 44Z', c, outline), path('M27 44 Q28 22 48 22 Q68 22 69 44 Q56 32 40 38 Q32 40 27 44Z', c, outline)],
  (c) => [circle(70, 58, 8, c, outline), path('M27 44 Q28 22 48 22 Q68 22 69 44 Q58 34 48 36 Q38 34 27 44Z', c, outline)],
  (c) => [circle(48, 18, 9, c, outline), path('M27 44 Q28 22 48 22 Q68 22 69 44 Q58 34 48 36 Q38 34 27 44Z', c, outline)],
  (c) => [path('M26 44 Q24 64 30 68 L66 68 Q72 64 70 44Z', c, outline), path('M27 44 Q28 22 48 22 Q68 22 69 44 Q56 36 48 38 Q40 36 27 44Z', c, outline)],
  (c) => ['', path('M42 24 Q48 8 54 24 L56 40 Q48 34 40 40Z', c, outline)],
  (c) => [circle(24, 56, 7, c, outline) + circle(72, 56, 7, c, outline), path('M27 44 Q28 22 48 22 Q68 22 69 44 Q58 34 48 36 Q38 34 27 44Z', c, outline)],
  (c) => [circle(48, 36, 27, c, outline), path('M29 44 Q32 28 48 28 Q64 28 67 44 Q58 38 48 40 Q38 38 29 44Z', c, outline)],
  (c) => ['', path('M30 38 Q48 26 66 38 Q56 33 48 34 Q40 33 30 38Z', c, outline)],
  (c) => ['', path('M27 46 Q26 22 50 22 Q68 24 69 44 Q66 32 44 36 Q36 40 27 46Z', c, outline)],
  (c) => ['', circle(32, 34, 8, c, outline) + circle(44, 26, 9, c, outline) + circle(58, 26, 9, c, outline) + circle(66, 36, 8, c, outline)],
  (c) => [path('M64 52 Q74 64 66 80 Q62 70 64 52Z', c, outline), path('M27 44 Q28 22 48 22 Q68 22 69 44 Q58 34 48 36 Q38 34 27 44Z', c, outline)],
  (c) => ['', path('M31 40 Q48 28 65 40 Q56 36 48 36 Q40 36 31 40Z', c, outline)],
]

const HATS = [
  () => '',
  (a) => path('M27 38 Q28 20 48 20 Q68 20 69 38Z', a, outline) + path('M44 38 L78 40 Q80 46 62 46 L44 44Z', a, outline),
  (a) => `<ellipse cx="48" cy="34" rx="34" ry="8" fill="#e8c878" ${outline}/>` + path('M32 34 Q34 14 48 14 Q62 14 64 34Z', '#f0d890', outline) + `<rect x="33" y="28" width="30" height="5" fill="${a}"/>`,
  (a) => path('M27 40 Q28 16 48 16 Q68 16 69 40Z', a, outline) + circle(48, 14, 4, '#fff', outline),
  (a) => `<rect x="27" y="32" width="42" height="7" rx="3" fill="${a}" ${outline}/>`,
  (a) => path('M26 42 Q26 16 48 16 Q70 16 70 42Z', a, outline) + `<rect x="44" y="18" width="8" height="22" fill="#fff" opacity=".55"/>`,
  (a) => path('M30 36 L48 -6 L66 36Z', a, outline) + `<ellipse cx="48" cy="36" rx="26" ry="6" fill="${a}" ${outline}/>`,
  (a) => path('M27 36 Q48 22 69 36 L72 46 L24 46Z', a, outline) + circle(34, 36, 2, '#fff') + circle(48, 31, 2, '#fff') + circle(62, 36, 2, '#fff'),
  (a) => `<rect x="30" y="2" width="36" height="30" rx="3" fill="${INK}" ${outline}/><rect x="30" y="24" width="36" height="6" fill="${a}"/><ellipse cx="48" cy="34" rx="28" ry="6" fill="${INK}" ${outline}/>`,
  (a) => `<rect x="30" y="28" width="16" height="12" rx="6" fill="${a}" ${outline}/><rect x="50" y="28" width="16" height="12" rx="6" fill="${a}" ${outline}/>` + `<rect x="27" y="32" width="42" height="4" fill="${INK}"/>`,
]

const ACCESSORIES = [
  () => '',
  () => `<rect x="31" y="42" width="15" height="11" rx="5" fill="#cfeaff" opacity=".6" ${outline}/><rect x="50" y="42" width="15" height="11" rx="5" fill="#cfeaff" opacity=".6" ${outline}/>`,
  (a) => `<rect x="34" y="63" width="28" height="9" rx="4" fill="${a}" ${outline}/>` + path('M56 70 L60 86 L52 84Z', a, outline),
  (a) => path('M34 72 L40 100', 'none', `stroke="${a}" stroke-width="5" stroke-linecap="round"`) + path('M62 72 L56 100', 'none', `stroke="${a}" stroke-width="5" stroke-linecap="round"`),
  (a) => circle(28, 58, 3.4, a, outline),
  () => `<rect x="56" y="52" width="9" height="6" rx="2" fill="#fff" ${outline}/>`,
  (a) => path('M24 72 Q48 64 72 72 L76 92 L20 92Z', a, outline, 'opacity=".9"'),
  (a) => `<line x1="48" y1="66" x2="48" y2="76" stroke="${INK}" stroke-width="2"/>` + circle(48, 80, 5, a, outline),
]

const EMBLEMS = [
  (a) => circle(48, 90, 5, a, outline),
  (a) => path('M48 84 L53 94 L43 94Z', a, outline),
  (a) => `<rect x="43" y="85" width="10" height="10" rx="2" fill="${a}" ${outline}/>`,
  (a) => path('M48 84 L50 90 L56 90 L51 94 L53 100 L48 96 L43 100 L45 94 L40 90 L46 90Z', a, outline),
  (a) => path('M48 96 Q40 90 42 86 Q46 84 48 88 Q50 84 54 86 Q56 90 48 96Z', a, outline),
  (a) => path('M42 90 L48 84 L54 90 L48 96Z', a, outline),
]

/** A chibi trainer as one SVG string, built from a Look's layer indexes. */
export function portraitSvg(look, size = 96) {
  const hairColor = at(HAIR, look.hairColor)
  const skin = at(SKIN, look.skin)
  const outfit = at(OUTFIT, look.outfit)
  const accent = at(ACCENT, look.accent)
  const classIndex = CLASSES.findIndex((c) => c.id === look.cls)
  const [back, front] = at(HAIRS, look.hair)(hairColor)
  const hue = classIndex < 0 ? 0 : 20 + classIndex * 37
  const body =
    path('M26 120 Q24 78 48 74 Q72 78 70 120Z', outfit, outline) +
    `<rect x="26" y="108" width="44" height="12" fill="hsl(${hue} 55% 38%)" opacity=".55"/>` +
    at(EMBLEMS, classIndex < 0 ? 0 : classIndex)(accent) +
    `<rect x="42" y="66" width="12" height="12" rx="4" fill="${skin}" ${outline}/>`
  const face =
    circle(48, 46, 20, skin, outline) +
    circle(40, 49, 3.4, INK) + circle(56, 49, 3.4, INK) +
    circle(41.2, 47.8, 1.1, '#fff') + circle(57.2, 47.8, 1.1, '#fff') +
    path('M43 58 Q48 62 53 58', 'none', `stroke="${INK}" stroke-width="2.2" stroke-linecap="round"`) +
    circle(35, 55, 3.4, '#ff8aa0', 'opacity=".35"') + circle(61, 55, 3.4, '#ff8aa0', 'opacity=".35"')
  const parts = [
    back, body, face,
    front, at(HATS, look.hat)(accent), at(ACCESSORIES, look.accessory)(accent),
  ]
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -8 108 132" width="${size}" height="${Math.round(size * 1.22)}">${parts.join('')}</svg>`
}
