// "Cuộc gặp hôm nay": three Pokémon drawn from the whole National Dex,
// seeded by the visitor's date and time down to the second, so every visit
// meets someone new while one moment always gives the same three.
import { pokemonLabel } from '../../components/pokemon-page/format.mjs'
import { TYPE_DATA } from '../../components/pokemon-page/type-data.mjs'
import { typesOf } from '../../components/pokemon-page/type-index.mjs'

const POKEMON_COUNT = 1025
// Gen 1 has small local artwork (/images/pokemon/<id>.webp)
const LOCAL_ART_MAX = 151

// Hand-written encounters keep their copy and their large hero artwork.
const CURATED = {
  25: {
    note: 'Nhỏ bé. Năng lượng thì không.',
    word: 'PIKA!',
    color: '#ffda55',
    hero: true,
  },
  6: {
    note: 'Một cuộc gặp. Cả bầu trời rực lửa.',
    word: 'ROAR!',
    color: '#f7b78b',
    hero: true,
  },
  94: {
    note: 'Có gì đó đang cười trong bóng tối.',
    word: 'BOO!',
    color: '#c9b7ee',
    hero: true,
  },
}

// One line and one sound per primary type, for everyone else.
const FLAVOR = {
  normal: { word: 'HEY!', note: 'Bình dị thôi, nhưng chẳng hề tầm thường.' },
  fire: { word: 'FWOOSH!', note: 'Lại gần là thấy ấm, lại gần nữa là bỏng.' },
  water: { word: 'SPLASH!', note: 'Cứ theo dòng nước, rồi sẽ gặp nhau.' },
  electric: { word: 'ZAP!', note: 'Chạm nhẹ thôi, kẻo tóc dựng đứng.' },
  grass: { word: 'RUSTLE!', note: 'Lặng lẽ lớn lên giữa nắng và gió.' },
  ice: { word: 'CRACK!', note: 'Lạnh lùng bên ngoài, lấp lánh bên trong.' },
  fighting: { word: 'HIYA!', note: 'Mỗi ngày một trận, mỗi trận một bài học.' },
  poison: { word: 'HISS!', note: 'Đẹp thì đẹp, nhưng đừng chạm vào.' },
  ground: { word: 'THUD!', note: 'Vững như đất, chẳng gì lay chuyển nổi.' },
  flying: { word: 'WHOOSH!', note: 'Bầu trời là nhà, gió là bạn đồng hành.' },
  psychic: { word: 'HMM…', note: 'Nó biết bạn định nói gì rồi đấy.' },
  bug: { word: 'BZZZ!', note: 'Nhỏ xíu thôi, nhưng chưa từng bỏ cuộc.' },
  rock: { word: 'CRUNCH!', note: 'Rắn rỏi qua bao mùa mưa nắng.' },
  ghost: { word: 'BOO!', note: 'Có gì đó vừa lướt qua sau lưng bạn.' },
  dragon: { word: 'ROAR!', note: 'Huyền thoại kể về nó, và giờ nó ở đây.' },
  dark: { word: 'SHHH…', note: 'Bóng tối là nơi nó thấy thoải mái nhất.' },
  steel: { word: 'CLANG!', note: 'Cứng cỏi từ vỏ ngoài đến trái tim.' },
  fairy: { word: 'TWINKLE!', note: 'Một chút phép màu cho ngày của bạn.' },
}

/** Hash of the local date and time, to the second (xmur3). */
export function seedFromDate(date) {
  const pad = (n) => String(n).padStart(2, '0')
  const text =
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  let h = 1779033703 ^ text.length
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return (h ^ (h >>> 16)) >>> 0
}

/** Seeded generator of floats in [0, 1) (mulberry32). */
export function random(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** `count` different National Dex numbers for this moment. */
export function pickEncounterIds(date, count = 3, max = POKEMON_COUNT) {
  const next = random(seedFromDate(date))
  const ids = []
  while (ids.length < Math.min(count, max)) {
    const id = 1 + Math.floor(next() * max)
    if (!ids.includes(id)) ids.push(id)
  }
  return ids
}

/** #rrggbb mixed toward white: a soft card colour from a type colour. */
export function tint(hex, amount = 0.62) {
  const value = parseInt(hex.slice(1), 16)
  const channel = (shift) => {
    const c = (value >> shift) & 255
    return Math.round(c + (255 - c) * amount)
  }
  return `#${[16, 8, 0]
    .map((shift) => channel(shift).toString(16).padStart(2, '0'))
    .join('')}`
}

/**
 * Everything the encounter card shows for one Pokémon. `name` is its
 * PokéAPI species name (from the list), or empty while the list loads.
 */
export function buildEncounter(id, name = '') {
  const types = typesOf(id)
  const primary = types[0] ?? 'normal'
  const curated = CURATED[id]
  const flavor = FLAVOR[primary] ?? FLAVOR.normal
  const labels = types.map((type) => TYPE_DATA[type]?.label ?? type)
  return {
    id,
    path: name || String(id),
    name: name ? pokemonLabel(name) : '',
    type: labels.join(' · '),
    code: labels.join(' / ').toLocaleUpperCase('vi'),
    color: curated?.color ?? tint(TYPE_DATA[primary]?.color ?? '#9fa19f'),
    note: curated?.note ?? flavor.note,
    word: curated?.word ?? flavor.word,
    art: curated?.hero ? `/images/pokemon/hero-${id}.webp` : null,
    coin: id <= LOCAL_ART_MAX ? `/images/pokemon/${id}.webp` : null,
  }
}
