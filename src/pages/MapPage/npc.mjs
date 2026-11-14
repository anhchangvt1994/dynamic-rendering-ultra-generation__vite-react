import { REGIONS } from './data/regions.mjs'
import { REGION_R, terrainSeed } from './layout.mjs'
import { coastRadius } from './terrain.mjs'
import { hashSeed, makeRng } from './rng.mjs'
import { TYPE_DATA } from '../../components/pokemon-page/type-data.mjs'

// [id, Vietnamese name, habitats where the class likes to stand]
/** @type {{ id: string, name: string, habitat: string[] }[]} */
export const CLASSES = [
  ['bug-catcher', 'Bắt bọ', ['grass']], ['fisher', 'Câu cá', ['lake', 'sea']], ['swimmer', 'Bơi lội', ['sea', 'lake']],
  ['hiker', 'Leo núi', ['mountain']], ['camper', 'Cắm trại', ['grass', 'route']], ['picnicker', 'Dã ngoại', ['grass']],
  ['youngster', 'Thiếu niên', ['route']], ['lass', 'Cô bé', ['route']], ['ace-trainer', 'Huấn luyện viên giỏi', []],
  ['breeder', 'Nhân giống', ['grass']], ['ranger', 'Kiểm lâm', ['grass', 'mountain']], ['scientist', 'Nhà khoa học', ['cave']],
  ['psychic', 'Nhà ngoại cảm', ['cave']], ['black-belt', 'Võ sĩ', ['mountain']], ['sailor', 'Thủy thủ', ['sea']],
  ['biker', 'Dân phượt', ['route']], ['rocker', 'Rocker', ['route']], ['gentleman', 'Quý ông', []],
  ['lady', 'Quý bà', []], ['collector', 'Nhà sưu tầm', []], ['ruin-maniac', 'Mê di tích', ['cave']],
  ['miner', 'Thợ mỏ', ['cave', 'mountain']], ['birdkeeper', 'Nuôi chim', ['mountain', 'route']], ['dragon-tamer', 'Thuần rồng', ['cave']],
  ['skier', 'Trượt tuyết', ['mountain']], ['surfer', 'Lướt sóng', ['sea']], ['gardener', 'Làm vườn', ['grass']],
  ['photographer', 'Nhiếp ảnh', []], ['backpacker', 'Khách ba lô', ['route']], ['cook', 'Đầu bếp', []],
  ['fairy-tale', 'Kể chuyện', ['grass']], ['stargazer', 'Ngắm sao', ['mountain']], ['diver', 'Thợ lặn', ['sea', 'lake']],
  ['artist', 'Họa sĩ', []],
].map(([id, name, habitat]) => ({ id: /** @type {string} */ (id), name: /** @type {string} */ (name), habitat: /** @type {string[]} */ (habitat) }))

export const PARTS = { hair: 14, hairColor: 12, skin: 8, hat: 10, outfit: 12, accent: 12, accessory: 8 }

export const lookKey = (l) => [l.cls, ...Object.keys(PARTS).map((k) => l[k])].join('.')

const FIRST = ['An', 'Bảo', 'Chi', 'Dũng', 'Giang', 'Hà', 'Khoa', 'Lan', 'Minh', 'Nam', 'Oanh', 'Phúc', 'Quân', 'Sơn', 'Thảo', 'Uyên', 'Việt', 'Yến', 'Hải', 'Linh', 'Tú', 'Vy', 'Khải', 'Mai', 'Ash', 'Misty', 'Rin', 'Kai', 'Nori', 'Sora', 'Luca', 'Ivy', 'Juno', 'Milo', 'Nova', 'Pip', 'Remy', 'Skye', 'Tess', 'Wren', 'Zed', 'Bram', 'Cleo', 'Dax', 'Edda', 'Finn', 'Gus', 'Hana']
const LAST = ['Cỏ Xanh', 'Gió Biển', 'Mây Trắng', 'Đá Núi', 'Lửa Nhỏ', 'Sao Đêm', 'Trăng Non', 'Suối Mát', 'Hoa Dại', 'Bão Cát', 'Tuyết Rơi', 'Lá Vàng', 'Nắng Mai', 'Sóng Bạc', 'Rừng Sâu', 'Đồi Thông', 'Cầu Vồng', 'Đèn Lồng', 'Hạt Dẻ', 'Cánh Diều', 'Thung Lũng', 'Đuôi Cáo', 'Mắt Mèo', 'Tai Thỏ', 'Pewter', 'Oak', 'Elm', 'Birch', 'Willow', 'Ember', 'Frost', 'Gale', 'Marsh', 'Quill', 'Reed', 'Stone', 'Thorn', 'Vale', 'Wick', 'Yarrow', 'Bloom', 'Dusk', 'Fable', 'Glint', 'Haze', 'Isle', 'Jade', 'Kite']
const NAME_STRIDE = 1031

export const NPC_COUNT = 16

/**
 * `count` NPCs for one island: a class, a layered look and a name each, stood
 * near the terrain their class likes (or beside a town). Fixed by the seed.
 */
export function generateNpcs({ regionId, zones, towns, seed, count }) {
  const rng = makeRng(hashSeed(regionId, 'npc', seed))
  const seedT = terrainSeed(regionId)
  const regionIndex = Math.max(0, REGIONS.findIndex((r) => r.id === regionId))
  const pick = (n) => Math.floor(rng() * n)
  const seen = new Set()
  const out = []
  for (let i = 0; i < count; i++) {
    const cls = CLASSES[pick(CLASSES.length)]
    let look
    do {
      look = { cls: cls.id, ...Object.fromEntries(Object.entries(PARTS).map(([k, n]) => [k, pick(n)])) }
    } while (seen.has(lookKey(look)))
    seen.add(lookKey(look))

    const homes = zones.filter((z) => cls.habitat.includes(z.kind))
    let anchor = homes.length ? homes[pick(homes.length)] : towns[pick(towns.length)]
    // the sea lies off the coast: its fans stand on the beach facing it
    if (anchor.kind === 'sea') {
      const c = coastRadius(seedT, Math.atan2(anchor.z, anchor.x), REGION_R) * 0.8
      const k = c / Math.hypot(anchor.x, anchor.z)
      anchor = { ...anchor, x: anchor.x * k, z: anchor.z * k, r: 4 }
    }
    const reach = homes.length ? anchor.r : 0
    const a = rng() * Math.PI * 2
    const d = homes.length ? Math.sqrt(rng()) * (reach + 2) : 12 + rng() * 16
    let x = anchor.x + Math.cos(a) * d
    let z = anchor.z + Math.sin(a) * d
    const far = Math.hypot(x, z)
    const limit = coastRadius(seedT, Math.atan2(z, x), REGION_R) * 0.86
    if (far > limit) {
      x *= limit / far
      z *= limit / far
    }
    const slot = (regionIndex * 64 + i) * NAME_STRIDE + (seed % 1000)
    const k = ((slot % (FIRST.length * LAST.length)) + FIRST.length * LAST.length) % (FIRST.length * LAST.length)
    out.push({
      id: `${regionId}-npc-${i + 1}`,
      kind: 'npc',
      cls: cls.id,
      name: `${FIRST[k % FIRST.length]} ${LAST[Math.floor(k / FIRST.length)]}`,
      look,
      x,
      z,
    })
  }
  return out
}

const TYPE_ORDER = Object.keys(TYPE_DATA)

/** A gym leader's look: outfit and accent follow the type, the rest follows the id. */
export function gymLeaderLook(gym) {
  const rng = makeRng(hashSeed(gym.id, 'look'))
  const pick = (n) => Math.floor(rng() * n)
  const t = Math.max(0, TYPE_ORDER.indexOf(gym.type))
  return {
    cls: 'leader',
    hair: pick(PARTS.hair),
    hairColor: pick(PARTS.hairColor),
    skin: pick(PARTS.skin),
    hat: pick(PARTS.hat),
    outfit: t % PARTS.outfit,
    accent: (t * 5 + 3) % PARTS.accent,
    accessory: 1 + pick(PARTS.accessory - 1),
  }
}
