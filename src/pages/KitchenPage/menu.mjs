// The menu a new player sees (and a guest): the known dishes in full, the
// secret ones as clues. No secret recipe or name: the page ships this.
// engine/kitchen.test.mjs checks the clues against the recipes.
import { byMenuOrder, dishView } from './kitchen.mjs'

export const KNOWN = [
  dishView('poffin-pecha', 'Poffin Pecha', 'poffin', [
    'pecha-berry',
    'pecha-berry',
    'moomoo-milk',
  ]),
  dishView('poffin-cheri', 'Poffin Cheri', 'poffin', [
    'cheri-berry',
    'cheri-berry',
    'lava-cookie',
  ]),
  dishView('tra-da-chesto', 'Trà đá Chesto', 'smoothie', [
    'chesto-berry',
    'chesto-berry',
    'fresh-water',
  ]),
  dishView('nuoc-chanh-aspear', 'Nước chanh Aspear', 'smoothie', [
    'aspear-berry',
    'lemonade',
  ]),
  dishView('sup-rawst', 'Súp Rawst', 'soup', [
    'rawst-berry',
    'rawst-berry',
    'oran-berry',
    'fresh-water',
  ]),
  dishView('sinh-to-cau-vong', 'Sinh tố cầu vồng', 'smoothie', [
    'oran-berry',
    'pecha-berry',
    'cheri-berry',
    'soda-pop',
  ]),
  dishView('banh-kem-sitrus', 'Bánh kem Sitrus', 'cake', [
    'sitrus-berry',
    'moomoo-milk',
    'casteliacone',
  ]),
  dishView('keo-deo-leppa', 'Kẹo dẻo Leppa', 'jelly', [
    'leppa-berry',
    'soda-pop',
  ]),
  dishView('banh-mi-lum', 'Bánh mì kẹp Lum', 'sandwich', [
    'lum-berry',
    'big-malasada',
    'cheri-berry',
  ]),
  dishView('ca-ri-lua', 'Cà ri lửa', 'curry', [
    'cheri-berry',
    'lava-cookie',
    'rage-candy-bar',
  ]),
  dishView('pudding-lumiose', 'Pudding Lumiose', 'pudding', [
    'lumiose-galette',
    'moomoo-milk',
    'chesto-berry',
  ]),
  dishView('banh-quy-pewter', 'Bánh quy Pewter', 'sandwich', [
    'pewter-crunchies',
    'rawst-berry',
    'oran-berry',
  ]),
]

export const SECRET_CLUES = [
  {
    id: 'bi-an-1',
    kind: 'poffin',
    secret: true,
    known: false,
    rarity: 3,
    count: 3,
    groups: { drink: 1, berry: 2 },
    top: ['happiness', 'wisdom'],
  },
  {
    id: 'bi-an-2',
    kind: 'jelly',
    secret: true,
    known: false,
    rarity: 3,
    count: 3,
    groups: { berry: 2, drink: 1 },
    top: ['agility', 'wisdom'],
  },
  {
    id: 'bi-an-3',
    kind: 'cake',
    secret: true,
    known: false,
    rarity: 3,
    count: 3,
    groups: { sweet: 2, berry: 1 },
    top: ['happiness', 'agility'],
  },
  {
    id: 'bi-an-4',
    kind: 'curry',
    secret: true,
    known: false,
    rarity: 3,
    count: 3,
    groups: { berry: 2, sweet: 1 },
    top: ['power', 'wisdom'],
  },
  {
    id: 'bi-an-5',
    kind: 'smoothie',
    secret: true,
    known: false,
    rarity: 3,
    count: 3,
    groups: { sweet: 1, berry: 1, drink: 1 },
    top: ['agility', 'happiness'],
  },
  {
    id: 'bi-an-6',
    kind: 'soup',
    secret: true,
    known: false,
    rarity: 3,
    count: 3,
    groups: { berry: 3 },
    top: ['power', 'beauty'],
  },
  {
    id: 'bi-an-7',
    kind: 'pudding',
    secret: true,
    known: false,
    rarity: 3,
    count: 3,
    groups: { drink: 1, sweet: 1, berry: 1 },
    top: ['wisdom', 'happiness'],
  },
  {
    id: 'bi-an-8',
    kind: 'cake',
    secret: true,
    known: false,
    rarity: 4,
    count: 4,
    groups: { berry: 4 },
    top: ['wisdom', 'power'],
  },
]

/** The menu with nothing found yet. */
export const publicMenu = () => ({
  dishes: [...KNOWN, ...SECRET_CLUES].sort(byMenuOrder),
  found: 0,
  attempts: [],
})
