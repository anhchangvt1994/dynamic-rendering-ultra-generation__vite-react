// Who's That Pokémon? gifts: real items from the games, ranked by what they will be
// worth to the features that come later (raising, bonding, evolving,
// teaching). Stats and friendship first, healing last.

export const itemSprite = (id) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${id}.png`

/** 4 legendary · 3 rare · 2 useful · 1 common; "valuable" is 3 and up. */
export const TIERS = {
  4: { label: 'Huyền thoại', color: '#ffcf3a' },
  3: { label: 'Quý hiếm', color: '#c38bff' },
  2: { label: 'Hữu ích', color: '#4fb4ff' },
  1: { label: 'Thường', color: '#7fdcae' },
}
export const VALUABLE = 3
export const isValuable = (item) => item.tier >= VALUABLE

/** What a group of items will be for, once the feature exists. */
export const GROUPS = {
  stat: {
    label: 'Chỉ số',
    use: 'Nuôi dưỡng: tăng cấp và chỉ số cho Pokémon trong bộ sưu tập.',
  },
  friend: {
    label: 'Thân thiện',
    use: 'Thân thiết: điểm thân thiện mở khoá tương tác và tiến hoá nhờ tình bạn (Pichu, Eevee, Golbat…).',
  },
  evo: {
    label: 'Tiến hoá',
    use: 'Tiến hoá: dùng lên Pokémon trong bộ sưu tập để tiến hoá ngay.',
  },
  heal: {
    label: 'Hồi phục',
    use: 'Trận đấu: hồi HP, PP và chữa trạng thái giữa trận.',
  },
  move: {
    label: 'Chiêu thức',
    use: 'Đội hình: dạy chiêu cho Pokémon hợp hệ. Chỉ có ở chế độ Khó (tự gõ tên).',
  },
}

/** Stand-ins for the trade evolutions and the games' special evolution items. */
const evoItem = (id, name, who) => ({
  id,
  name,
  kind: 'stone',
  group: 'evo',
  tier: 1,
  effect: `Dùng lên Pokémon hợp để tiến hoá ngay: ${who}.`,
  stats: [
    ['Tiến hoá', 'Tức thì'],
    ['Dùng', '1 lần'],
  ],
})

const KINDS = {
  candy: 'Kẹo',
  vitamin: 'Thuốc bổ',
  cap: 'Nắp chai',
  held: 'Vật phẩm cầm',
  berry: 'Quả mọng',
  stone: 'Đá tiến hoá',
  drink: 'Nước uống',
  cake: 'Bánh',
  tm: 'TM',
  hm: 'HM',
}
export const kindLabel = (item) => KINDS[item.kind] ?? ''

const vitamin = (id, name, stat) => ({
  id,
  name,
  kind: 'vitamin',
  group: 'stat',
  tier: 3,
  effect: `Tăng 10 điểm nỗ lực (EV) cho ${stat}, chỉ số này lớn dần theo cấp. Pokémon cũng quý bạn hơn một chút.`,
  stats: [
    [`EV ${stat}`, '+10'],
    ['Thân thiện', '+5'],
  ],
})
const bond = (id, name, stat) => ({
  id,
  name,
  kind: 'berry',
  group: 'friend',
  tier: 3,
  effect: `Pokémon rất thích quả này: điểm thân thiện tăng mạnh, đổi lại giảm 10 EV ${stat} (dùng để chỉnh lại chỉ số đã nuôi lệch).`,
  stats: [
    ['Thân thiện', '+10'],
    [`EV ${stat}`, '−10'],
  ],
})
const stone = (id, name, who) => ({
  id,
  name,
  kind: 'stone',
  group: 'evo',
  tier: 2,
  effect: `Tiến hoá ngay, không cần lên cấp: ${who}.`,
  stats: [
    ['Tiến hoá', 'Tức thì'],
    ['Dùng', '1 lần'],
  ],
})
const cure = (id, name, kind, origin) => ({
  id,
  name,
  kind,
  group: 'heal',
  tier: 2,
  effect: `${origin} Chữa mọi trạng thái bất lợi: độc, bỏng, tê liệt, ngủ, đóng băng, rối loạn.`,
  stats: [['Trạng thái', 'Chữa hết']],
})
const status = (id, name, what) => ({
  id,
  name,
  kind: 'berry',
  group: 'heal',
  tier: 1,
  effect: `Pokémon cầm quả sẽ tự ăn khi bị ${what}, khỏi ngay.`,
  stats: [['Chữa', what]],
})
const drink = (id, name, hp, tier = 1) => ({
  id,
  name,
  kind: 'drink',
  group: 'heal',
  tier,
  effect: `Hồi ${hp} HP cho một Pokémon.`,
  stats: [['HP', `+${hp}`]],
})
const machine = (id, kind, no, move, type, category, power, accuracy, pp) => ({
  id,
  name: `${kind.toUpperCase()}${no} ${move}`,
  kind,
  group: 'move',
  tier: kind === 'tm' ? 4 : 3,
  hard: true,
  effect: `Dạy chiêu ${move} cho một Pokémon học được chiêu này.`,
  move: { name: move, type, category, power, accuracy, pp },
  stats: [
    ['Sức mạnh', String(power)],
    ['Chính xác', `${accuracy}%`],
    ['PP', String(pp)],
  ],
})

// NOTE - Most valuable first: a gift's place on the round's fuse and in the
// bag follows this order, not only its tier
export const ITEMS = [
  {
    id: 'gold-bottle-cap',
    name: 'Gold Bottle Cap',
    kind: 'cap',
    group: 'stat',
    tier: 4,
    effect:
      'Huấn luyện tối thượng: đưa cả 6 chỉ số cá thể (IV) lên mức hoàn hảo 31. Một Pokémon “sinh ra bình thường” thành tài năng bẩm sinh.',
    stats: [
      ['IV', '6 × 31'],
      ['Áp dụng', 'Cả 6 chỉ số'],
    ],
  },
  {
    id: 'rare-candy',
    name: 'Rare Candy',
    kind: 'candy',
    group: 'stat',
    tier: 4,
    effect:
      'Lên ngay 1 cấp, mọi chỉ số tăng theo. Đủ cấp thì Pokémon tiến hoá luôn.',
    stats: [
      ['Cấp độ', '+1'],
      ['Thân thiện', '+5'],
    ],
  },
  {
    id: 'bottle-cap',
    name: 'Bottle Cap',
    kind: 'cap',
    group: 'stat',
    tier: 4,
    effect:
      'Huấn luyện đặc biệt: chọn một chỉ số cá thể (IV) và đưa nó lên mức hoàn hảo 31.',
    stats: [
      ['IV', '1 × 31'],
      ['Áp dụng', 'Tự chọn'],
    ],
  },
  {
    id: 'soothe-bell',
    name: 'Soothe Bell',
    kind: 'held',
    group: 'friend',
    tier: 4,
    effect:
      'Chiếc chuông ngân êm dịu. Pokémon cầm nó tăng điểm thân thiện nhanh gấp rưỡi với mọi việc: đi cùng, lên cấp, được cho ăn.',
    stats: [
      ['Thân thiện', '×1,5'],
      ['Dùng', 'Mãi mãi'],
    ],
  },
  {
    id: 'pp-max',
    name: 'PP Max',
    kind: 'vitamin',
    group: 'stat',
    tier: 4,
    effect:
      'Nâng số lần dùng (PP) tối đa của một chiêu lên mức cao nhất, 160% ban đầu.',
    stats: [['PP tối đa', '+60%']],
  },
  machine(
    'tm-normal',
    'tm',
    15,
    'Hyper Beam',
    'normal',
    'Đặc biệt',
    150,
    90,
    5
  ),
  machine(
    'tm-fighting',
    'tm',
    52,
    'Focus Blast',
    'fighting',
    'Đặc biệt',
    120,
    70,
    5
  ),
  machine(
    'tm-ground',
    'tm',
    26,
    'Earthquake',
    'ground',
    'Vật lý',
    100,
    100,
    10
  ),
  machine(
    'tm-electric',
    'tm',
    24,
    'Thunderbolt',
    'electric',
    'Đặc biệt',
    90,
    100,
    15
  ),
  machine('tm-fire', 'tm', 35, 'Flamethrower', 'fire', 'Đặc biệt', 90, 100, 15),
  machine('tm-ice', 'tm', 13, 'Ice Beam', 'ice', 'Đặc biệt', 90, 100, 10),
  machine(
    'tm-psychic',
    'tm',
    29,
    'Psychic',
    'psychic',
    'Đặc biệt',
    90,
    100,
    10
  ),
  machine(
    'tm-grass',
    'tm',
    53,
    'Energy Ball',
    'grass',
    'Đặc biệt',
    90,
    100,
    10
  ),
  machine(
    'tm-dragon',
    'tm',
    59,
    'Dragon Pulse',
    'dragon',
    'Đặc biệt',
    85,
    100,
    10
  ),
  machine(
    'tm-ghost',
    'tm',
    30,
    'Shadow Ball',
    'ghost',
    'Đặc biệt',
    80,
    100,
    15
  ),
  vitamin('protein', 'Protein', 'Attack'),
  vitamin('calcium', 'Calcium', 'Sp. Atk'),
  vitamin('carbos', 'Carbos', 'Speed'),
  vitamin('hp-up', 'HP Up', 'HP'),
  vitamin('iron', 'Iron', 'Defense'),
  vitamin('zinc', 'Zinc', 'Sp. Def'),
  machine('hm-water', 'hm', '03', 'Surf', 'water', 'Đặc biệt', 90, 100, 15),
  machine('hm-flying', 'hm', '02', 'Fly', 'flying', 'Vật lý', 90, 95, 15),
  machine('hm-normal', 'hm', '04', 'Strength', 'normal', 'Vật lý', 80, 100, 15),
  {
    id: 'pp-up',
    name: 'PP Up',
    kind: 'vitamin',
    group: 'stat',
    tier: 3,
    effect:
      'Tăng 20% số lần dùng (PP) tối đa của một chiêu. Dùng tối đa 3 lần cho mỗi chiêu.',
    stats: [['PP tối đa', '+20%']],
  },
  bond('pomeg-berry', 'Pomeg Berry', 'HP'),
  bond('kelpsy-berry', 'Kelpsy Berry', 'Attack'),
  bond('qualot-berry', 'Qualot Berry', 'Defense'),
  bond('hondew-berry', 'Hondew Berry', 'Sp. Atk'),
  bond('grepa-berry', 'Grepa Berry', 'Sp. Def'),
  bond('tamato-berry', 'Tamato Berry', 'Speed'),
  stone(
    'thunder-stone',
    'Thunder Stone',
    'Pikachu → Raichu, Eevee → Jolteon, Eelektrik → Eelektross, Charjabug → Vikavolt'
  ),
  stone(
    'fire-stone',
    'Fire Stone',
    'Vulpix → Ninetales, Growlithe → Arcanine, Eevee → Flareon, Pansear → Simisear'
  ),
  stone(
    'water-stone',
    'Water Stone',
    'Poliwhirl → Poliwrath, Shellder → Cloyster, Staryu → Starmie, Eevee → Vaporeon, Lombre → Ludicolo'
  ),
  stone(
    'leaf-stone',
    'Leaf Stone',
    'Gloom → Vileplume, Weepinbell → Victreebel, Exeggcute → Exeggutor, Nuzleaf → Shiftry'
  ),
  stone(
    'moon-stone',
    'Moon Stone',
    'Nidorina → Nidoqueen, Nidorino → Nidoking, Clefairy → Clefable, Jigglypuff → Wigglytuff, Munna → Musharna'
  ),
  stone(
    'ice-stone',
    'Ice Stone',
    'Eevee → Glaceon, Sandshrew Alola → Sandslash Alola, Vulpix Alola → Ninetales Alola, Crabrawler → Crabominable'
  ),
  stone(
    'shiny-stone',
    'Shiny Stone',
    'Togetic → Togekiss, Roselia → Roserade, Minccino → Cinccino, Floette → Florges'
  ),
  stone(
    'dusk-stone',
    'Dusk Stone',
    'Murkrow → Honchkrow, Misdreavus → Mismagius, Lampent → Chandelure, Doublade → Aegislash'
  ),
  stone('dawn-stone', 'Dawn Stone', 'Kirlia ♂ → Gallade, Snorunt ♀ → Froslass'),
  stone(
    'sun-stone',
    'Sun Stone',
    'Gloom → Bellossom, Sunkern → Sunflora, Cottonee → Whimsicott, Petilil → Lilligant, Helioptile → Heliolisk'
  ),
  {
    id: 'sitrus-berry',
    name: 'Sitrus Berry',
    kind: 'berry',
    group: 'heal',
    tier: 2,
    effect:
      'Pokémon cầm quả sẽ tự ăn khi HP tụt dưới một nửa, hồi ngay một phần tư HP tối đa.',
    stats: [['HP', '+25%']],
  },
  {
    id: 'lum-berry',
    name: 'Lum Berry',
    kind: 'berry',
    group: 'heal',
    tier: 2,
    effect:
      'Pokémon cầm quả sẽ tự ăn khi gặp bất kỳ trạng thái bất lợi nào, khỏi ngay.',
    stats: [['Trạng thái', 'Chữa hết']],
  },
  {
    id: 'leppa-berry',
    name: 'Leppa Berry',
    kind: 'berry',
    group: 'heal',
    tier: 2,
    effect: 'Hồi 10 PP cho một chiêu khi chiêu đó cạn PP.',
    stats: [['PP', '+10']],
  },
  drink('moomoo-milk', 'Moomoo Milk', 100, 2),
  cure(
    'rage-candy-bar',
    'Rage Candy Bar',
    'candy',
    'Kẹo thanh đặc sản thị trấn Mahogany.'
  ),
  cure('big-malasada', 'Big Malasada', 'cake', 'Bánh rán đặc sản vùng Alola.'),
  cure('lava-cookie', 'Lava Cookie', 'cake', 'Bánh quy đặc sản Lavaridge.'),
  cure(
    'old-gateau',
    'Old Gateau',
    'cake',
    'Bánh ngọt bí truyền của Old Chateau.'
  ),
  cure(
    'casteliacone',
    'Casteliacone',
    'cake',
    'Kem ốc quế nổi tiếng thành phố Castelia.'
  ),
  cure(
    'lumiose-galette',
    'Lumiose Galette',
    'cake',
    'Bánh galette giòn của Lumiose.'
  ),
  cure(
    'shalour-sable',
    'Shalour Sable',
    'cake',
    'Bánh quy bơ của thành phố Shalour.'
  ),
  cure(
    'pewter-crunchies',
    'Pewter Crunchies',
    'cake',
    'Bánh giòn đặc sản Pewter.'
  ),
  drink('lemonade', 'Lemonade', 80),
  drink('soda-pop', 'Soda Pop', 60),
  drink('fresh-water', 'Fresh Water', 50),
  {
    id: 'oran-berry',
    name: 'Oran Berry',
    kind: 'berry',
    group: 'heal',
    tier: 1,
    effect: 'Pokémon cầm quả sẽ tự ăn khi HP thấp, hồi 10 HP.',
    stats: [['HP', '+10']],
  },
  status('cheri-berry', 'Cheri Berry', 'tê liệt'),
  status('chesto-berry', 'Chesto Berry', 'ngủ'),
  status('pecha-berry', 'Pecha Berry', 'trúng độc'),
  status('rawst-berry', 'Rawst Berry', 'bỏng'),
  status('aspear-berry', 'Aspear Berry', 'đóng băng'),
  evoItem(
    'linking-cord',
    'Linking Cord',
    'Kadabra → Alakazam, Machoke → Machamp, Graveler → Golem, Haunter → Gengar và các Pokémon tiến hoá khi trao đổi'
  ),
  evoItem(
    'kings-rock',
    "King's Rock",
    'Poliwhirl → Politoed, Slowpoke → Slowking'
  ),
  evoItem('metal-coat', 'Metal Coat', 'Onix → Steelix, Scyther → Scizor'),
  evoItem('protector', 'Protector', 'Rhydon → Rhyperior'),
  evoItem('dragon-scale', 'Dragon Scale', 'Seadra → Kingdra'),
  evoItem('black-augurite', 'Black Augurite', 'Scyther → Kleavor'),
  evoItem('electirizer', 'Electirizer', 'Electabuzz → Electivire'),
  evoItem('magmarizer', 'Magmarizer', 'Magmar → Magmortar'),
  evoItem('up-grade', 'Up-Grade', 'Porygon → Porygon2'),
  evoItem('dubious-disc', 'Dubious Disc', 'Porygon2 → Porygon-Z'),
  evoItem('peat-block', 'Peat Block', 'Ursaring → Ursaluna'),
  evoItem('prism-scale', 'Prism Scale', 'Feebas → Milotic'),
  evoItem('reaper-cloth', 'Reaper Cloth', 'Dusclops → Dusknoir'),
  evoItem('deep-sea-tooth', 'Deep Sea Tooth', 'Clamperl → Huntail'),
  evoItem('deep-sea-scale', 'Deep Sea Scale', 'Clamperl → Gorebyss'),
  evoItem('sachet', 'Sachet', 'Spritzee → Aromatisse'),
  evoItem('whipped-dream', 'Whipped Dream', 'Swirlix → Slurpuff'),
  evoItem('tart-apple', 'Tart Apple', 'Applin → Flapple'),
  evoItem('sweet-apple', 'Sweet Apple', 'Applin → Appletun'),
  evoItem('syrupy-apple', 'Syrupy Apple', 'Applin → Dipplin'),
  evoItem('metal-alloy', 'Metal Alloy', 'Duraludon → Archaludon'),
  evoItem('auspicious-armor', 'Auspicious Armor', 'Charcadet → Armarouge'),
  evoItem('malicious-armor', 'Malicious Armor', 'Charcadet → Ceruledge'),
]

const ORDER = new Map(ITEMS.map((item, index) => [item.id, index]))
const BY_ID = new Map(ITEMS.map((item) => [item.id, item]))
export const itemById = (id) => BY_ID.get(id)
/** Most valuable first (the catalogue's order). */
export const byValue = (a, b) => ORDER.get(a.id) - ORDER.get(b.id)

// NOTE - The round's fuse: gift i is won while the veil still has more than
// SLOT_AT[i] left (1 → 0). The first gift is the hardest to win
export const SLOT_AT = [0.75, 0.5, 0.25, 0]

/** The gift a guess wins with `left` veil remaining; -1 once it is all gone. */
export function slotFor(left) {
  return SLOT_AT.findIndex((at) => left > at)
}

// the tiers each gift on the fuse is drawn from, earliest first
// NOTE - Legendary and rare items are meant to be earned. A round's best gift
// is rarely more than useful; a streak's chest is sure of one rare item but
// seldom a legendary; only the special chest (10 records) is generous
const SLOT_WEIGHTS = [
  { 4: 2, 3: 10, 2: 50, 1: 38 },
  { 4: 0.5, 3: 5, 2: 42, 1: 52.5 },
  { 3: 2, 2: 30, 1: 68 },
  { 2: 12, 1: 88 },
]
// a streak of 10: the promised rare one, then the rest
const COMBO_SURE = { 4: 8, 3: 92 }
const COMBO_WEIGHTS = { 4: 2, 3: 10, 2: 48, 1: 40 }
// 10 records: the promised three, then the rest; the best odds anywhere
const SPECIAL_SURE = { 4: 50, 3: 50 }
const SPECIAL_WEIGHTS = { 4: 12, 3: 28, 2: 40, 1: 20 }
// one round in four hides a bonus turn behind one of its gifts
const BONUS_CHANCE = 0.25

const weighted = (weights, random) => {
  const entries = Object.entries(weights)
  let roll = random() * entries.reduce((sum, [, w]) => sum + w, 0)
  for (const [tier, weight] of entries) {
    roll -= weight
    if (roll < 0) return Number(tier)
  }
  return Number(entries[entries.length - 1][0])
}

// TM and HM only come from typing a name (hard mode), never from a chest
const pool = (tier, hard) =>
  ITEMS.filter((item) => item.tier === tier && (hard || !item.hard))

const draw = (weights, random, hard, taken) => {
  for (let tries = 0; tries < 20; tries++) {
    const choices = pool(weighted(weights, random), hard).filter(
      (item) => !taken.has(item.id)
    )
    if (choices.length) {
      const item = choices[Math.floor(random() * choices.length)]
      taken.add(item.id)
      return item
    }
  }
  return null
}

/**
 * A round's four gifts, most valuable first (the earliest on the fuse), and
 * the one carrying a bonus turn (-1 for none).
 */
export function roundGifts(random = Math.random, { hard = false } = {}) {
  const taken = new Set()
  const gifts = SLOT_WEIGHTS.map((weights) =>
    draw(weights, random, hard, taken)
  )
    .filter(Boolean)
    .sort(byValue)
  const bonus =
    random() < BONUS_CHANCE ? Math.floor(random() * gifts.length) : -1
  return { gifts: gifts.map((item) => item.id), bonus }
}

/**
 * A chest: `size` gifts with at least `valuable` of them rare or better,
 * most valuable first.
 */
export function chestGifts(
  random = Math.random,
  { size, valuable, sure = COMBO_SURE, rest = COMBO_WEIGHTS }
) {
  const taken = new Set()
  const gifts = []
  for (let i = 0; i < size; i++) {
    const weights = i < valuable ? sure : rest
    const item = draw(weights, random, false, taken)
    if (item) gifts.push(item)
  }
  return gifts.sort(byValue).map((item) => item.id)
}

// a streak of 10: 3–5 gifts, one rare at least; 10 of those: 10 gifts, 3 rare
export const comboGifts = (random = Math.random) =>
  chestGifts(random, { size: 3 + Math.floor(random() * 3), valuable: 1 })
export const specialGifts = (random = Math.random) =>
  chestGifts(random, {
    size: 10,
    valuable: 3,
    sure: SPECIAL_SURE,
    rest: SPECIAL_WEIGHTS,
  })

// NOTE - Flavours (potencies in tens) of the items the kitchen cooks with
// (src/pages/KitchenPage): the berries' are the games' (PokéAPI berry/*),
// the drinks' and sweets' were given to fit. The kitchen's migration
// (20261104000000_kitchen.sql) has the same table: recipes.test.mjs checks
export const FLAVORS = {
  'oran-berry': { spicy: 10, dry: 10, bitter: 10, sour: 10 },
  'sitrus-berry': { dry: 10, sweet: 10, bitter: 10, sour: 10 },
  'lum-berry': { spicy: 10, dry: 10, sweet: 10, bitter: 10 },
  'leppa-berry': { spicy: 10, sweet: 10, bitter: 10, sour: 10 },
  'cheri-berry': { spicy: 10 },
  'chesto-berry': { dry: 10 },
  'pecha-berry': { sweet: 10 },
  'rawst-berry': { bitter: 10 },
  'aspear-berry': { sour: 10 },
  'pomeg-berry': { spicy: 10, sweet: 10, bitter: 10 },
  'kelpsy-berry': { dry: 10, bitter: 10, sour: 10 },
  'qualot-berry': { spicy: 10, sweet: 10, sour: 10 },
  'hondew-berry': { spicy: 10, dry: 10, bitter: 10 },
  'grepa-berry': { dry: 10, sweet: 10, sour: 10 },
  'tamato-berry': { spicy: 20, dry: 10 },
  'fresh-water': {},
  'moomoo-milk': { sweet: 10 },
  lemonade: { sour: 20, sweet: 10 },
  'soda-pop': { sweet: 10, spicy: 10 },
  'rage-candy-bar': { spicy: 20, sweet: 10 },
  'big-malasada': { sweet: 20 },
  'lava-cookie': { spicy: 20 },
  'old-gateau': { bitter: 20, sweet: 10 },
  casteliacone: { sweet: 10, dry: 10 },
  'lumiose-galette': { dry: 20 },
  'shalour-sable': { sour: 10, sweet: 10 },
  'pewter-crunchies': { bitter: 10, dry: 10 },
}

/** The 5 flavours: their names and the games' Pokéblock colours. */
export const FLAVOR_INFO = {
  spicy: { label: 'Cay', color: '#e5483b' },
  dry: { label: 'Chát', color: '#3b7be5' },
  sweet: { label: 'Ngọt', color: '#f07cb4' },
  bitter: { label: 'Đắng', color: '#3fa463' },
  sour: { label: 'Chua', color: '#e8c022' },
}

/** The ingredients, in the catalogue's order. */
export const INGREDIENTS = ITEMS.map((item) => item.id).filter(
  (id) => id in FLAVORS
)

/** An item's flavours ({} for water), null when it is no ingredient. */
export const flavorsOf = (id) => FLAVORS[id] ?? null
