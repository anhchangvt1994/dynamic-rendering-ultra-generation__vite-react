import { GENERATIONS } from '../../HomePage/catalog.mjs'
import { GYMS } from './gyms.mjs'

// Towns beyond the gym towns: [id, name]. The "league" town is where the
// Elite Four and the Champion wait.
const EXTRA = {
  kanto: [['pallet', 'Pallet'], ['league', 'Cao nguyên Indigo']],
  johto: [['newbark', 'New Bark'], ['league', 'Cao nguyên Indigo']],
  hoenn: [['littleroot', 'Littleroot'], ['league', 'Ever Grande']],
  sinnoh: [['twinleaf', 'Twinleaf'], ['league', 'Pokémon League']],
  unova: [['nuvema', 'Nuvema'], ['league', 'Pokémon League']],
  kalos: [['vaniville', 'Vaniville'], ['league', 'Pokémon League']],
  alola: [['hauoli', 'Hau’oli'], ['league', 'Núi Lanakila']],
  galar: [['postwick', 'Postwick'], ['wyndon', 'Wyndon']],
  paldea: [['mesagoza', 'Mesagoza'], ['league', 'Pokémon League']],
}
const NAMES = {
  pewter: 'Pewter', cerulean: 'Cerulean', vermilion: 'Vermilion', celadon: 'Celadon', fuchsia: 'Fuchsia', saffron: 'Saffron', cinnabar: 'Cinnabar', viridian: 'Viridian',
  violet: 'Violet', azalea: 'Azalea', goldenrod: 'Goldenrod', ecruteak: 'Ecruteak', cianwood: 'Cianwood', olivine: 'Olivine', mahogany: 'Mahogany', blackthorn: 'Blackthorn',
  rustboro: 'Rustboro', dewford: 'Dewford', mauville: 'Mauville', lavaridge: 'Lavaridge', petalburg: 'Petalburg', fortree: 'Fortree', mossdeep: 'Mossdeep', sootopolis: 'Sootopolis',
  oreburgh: 'Oreburgh', eterna: 'Eterna', veilstone: 'Veilstone', pastoria: 'Pastoria', hearthome: 'Hearthome', canalave: 'Canalave', snowpoint: 'Snowpoint', sunyshore: 'Sunyshore',
  striaton: 'Striaton', nacrene: 'Nacrene', castelia: 'Castelia', nimbasa: 'Nimbasa', driftveil: 'Driftveil', mistralton: 'Mistralton', icirrus: 'Icirrus', opelucid: 'Opelucid',
  santalune: 'Santalune', cyllage: 'Cyllage', shalour: 'Shalour', coumarine: 'Coumarine', lumiose: 'Lumiose', laverre: 'Laverre', anistar: 'Anistar', snowbelle: 'Snowbelle',
  iki: 'Iki (Melemele)', konikoni: 'Konikoni (Akala)', malie: 'Malie (Ula’ula)', poni: 'Poni',
  turffield: 'Turffield', hulbury: 'Hulbury', motostoke: 'Motostoke', stow: 'Stow-on-Side', ballonlea: 'Ballonlea', circhester: 'Circhester', spikemuth: 'Spikemuth', hammerlocke: 'Hammerlocke',
  cortondo: 'Cortondo', artazon: 'Artazon', levincia: 'Levincia', cascarrafa: 'Cascarrafa', medali: 'Medali', montenevera: 'Montenevera', alfornada: 'Alfornada', glaseado: 'Glaseado',
}

// name = tên vùng; palette: grass/rock/water = địa hình, glow = ánh sáng viền, sky = quầng trời
const BASE = [
  ['kanto', 'Kanto', '1', { grass: '#86e08f', rock: '#b7b0c8', water: '#74d6f7', glow: '#ff7aa8', sky: '#bfeaff' }, { route: 6, grass: 6, lake: 2, sea: 2, mountain: 2, cave: 2 }],
  ['johto', 'Johto', '2', { grass: '#d7e56a', rock: '#c9a37a', water: '#7fd0e8', glow: '#ffbe3d', sky: '#fff1b8' }, { route: 5, grass: 5, lake: 2, sea: 2, mountain: 2, cave: 3 }],
  ['hoenn', 'Hoenn', '3', { grass: '#52dcb0', rock: '#e0907a', water: '#35c4f0', glow: '#19c4a8', sky: '#b6f6ee' }, { route: 5, grass: 5, lake: 2, sea: 4, mountain: 2, cave: 2 }],
  ['sinnoh', 'Sinnoh', '4', { grass: '#b9a8f0', rock: '#9aa0c8', water: '#8ab6f0', glow: '#9a7cf0', sky: '#e2d8ff' }, { route: 5, grass: 4, lake: 3, sea: 1, mountain: 4, cave: 3 }],
  ['unova', 'Unova', '5', { grass: '#ffb3a0', rock: '#b79aa8', water: '#8fc4f4', glow: '#ff8a70', sky: '#ffd9d0' }, { route: 5, grass: 4, lake: 2, sea: 1, mountain: 3, cave: 4 }],
  ['kalos', 'Kalos', '6', { grass: '#ffa6c8', rock: '#c6a8b8', water: '#9fd6f6', glow: '#ff5f9e', sky: '#ffd0e6' }, { route: 5, grass: 5, lake: 2, sea: 2, mountain: 2, cave: 2 }],
  ['alola', 'Alola', '7', { grass: '#ffc861', rock: '#e0865a', water: '#2fd6c4', glow: '#ff9a2e', sky: '#ffe2b0' }, { route: 4, grass: 4, lake: 1, sea: 5, mountain: 2, cave: 2 }],
  ['galar', 'Galar & Hisui', '8', { grass: '#9fe8b0', rock: '#9fb0b8', water: '#6ac0e8', glow: '#3fcf8a', sky: '#cdf6dc' }, { route: 5, grass: 5, lake: 3, sea: 2, mountain: 3, cave: 2 }],
  ['paldea', 'Paldea', '9', { grass: '#ff9f6a', rock: '#d56a5a', water: '#5cc6ea', glow: '#ff5a3c', sky: '#ffd0b8' }, { route: 5, grass: 5, lake: 2, sea: 2, mountain: 3, cave: 3 }],
]

/**
 * @typedef {{ grass: string, rock: string, water: string, glow: string, sky: string }} Palette
 * @typedef {{ id: string, name: string, gym?: string }} Town
 * @typedef {{ id: string, name: string, genId: string, dex: number[], palette: Palette, counts: Record<string, number>, towns: Town[] }} Region
 */
/** @type {Region[]} */
export const REGIONS = BASE.map(([id, name, genId, palette, counts]) => {
  const gen = GENERATIONS.find((g) => g.id === genId)
  const gymTowns = [...new Set(GYMS.filter((g) => g.region === id && (g.kind === 'gym' || g.kind === 'kahuna')).map((g) => g.town))]
  const towns = [
    ...EXTRA[id].slice(0, 1),
    ...gymTowns.map((t) => [t, NAMES[t]]),
    ...EXTRA[id].slice(1),
  ].map(([tid, tname]) => ({ tid, tname }))
  return {
    id,
    name,
    genId,
    dex: [gen.start, gen.end],
    palette,
    counts,
    towns: towns.map(({ tid, tname }) => {
      const gym = GYMS.find((g) => g.region === id && g.town === tid && (g.kind === 'gym' || g.kind === 'kahuna'))
      return { id: tid, name: tname ?? NAMES[tid], ...(gym ? { gym: gym.id } : {}) }
    }),
  }
})
