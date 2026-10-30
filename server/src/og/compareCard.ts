import fs from 'fs'
import path from 'path'

/**
 * The 1200×630 share card of a comparison, in the arena's look: a red and
 * blue field split by a yellow diagonal seam, the two portraits, the VS
 * badge, two name plates (rank, BST, types, a crown for the leader) and a
 * yellow strip with the verdict. 0, 1 or 2 Pokémon.
 *
 * Built as a Satori tree (plain objects, no React on the server). Names,
 * ranks and the verdict come from the page's own modules (src/*.mjs), so
 * the card always says what the page says.
 */

export const CARD_WIDTH = 1200
export const CARD_HEIGHT = 630

type Node = {
  type: string
  props: Record<string, unknown> & { style?: Record<string, unknown> }
}
const h = (
  type: string,
  style: Record<string, unknown>,
  children?: unknown,
  props: Record<string, unknown> = {}
): Node => ({
  type,
  props: {
    ...props,
    style: { display: 'flex', ...style },
    ...(children === undefined ? {} : { children }),
  },
})

const ROOT = path.resolve(__dirname, '../../..')
const shared = (file: string) =>
  import(path.join(ROOT, 'src', file)) as Promise<any>

// the page's modules: names, ranks, stats, verdict, type names and colours
export const loadShared = (() => {
  let modules: Promise<{
    pokemonLabel: (name: string) => string
    getPokemonPower: (stats: unknown[]) => {
      bst: number
      rank: string
      color: { a: string; b: string }
    }
    compareStats: (
      a: unknown,
      b: unknown
    ) => {
      totalA: number
      totalB: number
      winsA: number
      winsB: number
    }
    leaderOf: (result: unknown) => 'a' | 'b' | null
    verdictOf: (a: unknown, b: unknown) => string
    TYPE_DATA: Record<string, { label: string; color: string }>
  }>
  return () =>
    (modules ??= Promise.all([
      shared('components/pokemon-page/format.mjs'),
      shared('pages/PokemonPage/power.mjs'),
      shared('pages/ComparePage/compare.mjs'),
      shared('components/pokemon-page/type-data.mjs'),
    ]).then(([format, power, compare, types]) => ({
      pokemonLabel: format.pokemonLabel,
      getPokemonPower: power.getPokemonPower,
      compareStats: compare.compareStats,
      leaderOf: compare.leaderOf,
      verdictOf: compare.verdictOf,
      TYPE_DATA: types.TYPE_DATA,
    })))
})()

// NOTE - The site's own fonts, from @fontsource (Satori reads woff, not
// woff2), one file per subset. Satori does not look into a second file of
// the same family for a missing glyph, so each subset is its own family
// and the styles list them in order (DELA, BODY): ư ơ đ Đ ắ… come from the
// Vietnamese subset
export const loadFonts = (() => {
  let fonts: ReturnType<typeof read> | undefined
  const fontFile = (pkg: string, file: string) =>
    fs.readFileSync(
      path.join(
        path.dirname(require.resolve(`${pkg}/package.json`)),
        'files',
        file
      )
    )
  const read = () => [
    ...['latin', 'latin-ext', 'vietnamese'].map((subset) => ({
      name: `Dela ${subset}`,
      weight: 400 as const,
      style: 'normal' as const,
      data: fontFile(
        '@fontsource/dela-gothic-one',
        `dela-gothic-one-${subset}-400-normal.woff`
      ),
    })),
    ...([700, 800] as const).flatMap((weight) =>
      ['latin', 'vietnamese'].map((subset) => ({
        name: `Body ${subset}`,
        weight,
        style: 'normal' as const,
        data: fontFile(
          '@fontsource/be-vietnam-pro',
          `be-vietnam-pro-${subset}-${weight}-normal.woff`
        ),
      }))
    ),
  ]
  return () => (fonts ??= read())
})()

export type CardPokemon = {
  name: string
  stats: unknown[]
  types: { type: { name: string } }[]
  /** the portrait, a data: URI (already resized) */
  art?: string
}

const DELA = "'Dela latin', 'Dela latin-ext', 'Dela vietnamese'"
const BODY = "'Body latin', 'Body vietnamese'"

const INK = '#0b1626'
const YELLOW = '#ffda55'
const SIDE = { a: '#e3350d', b: '#2a6fdb' }

// #rrggbb mixed into the card's ink, like color-mix(in srgb, x p%, ink)
const mixInk = (hex: string, amount: number) => {
  const channel = (value: string, base: number) =>
    Math.round(parseInt(value, 16) * amount + base * (1 - amount))
  const [r, g, b] = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)]
  return `rgb(${channel(r, 11)}, ${channel(g, 22)}, ${channel(b, 38)})`
}

// a Poké Ball for the empty sides (inline SVG, no request)
const POKE_BALL = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-32 -32 64 64"><defs><clipPath id="c"><circle r="28"/></clipPath></defs><g clip-path="url(#c)"><rect x="-30" y="-30" width="60" height="30" fill="#e3350d"/><rect x="-30" y="0" width="60" height="30" fill="#f4f6f9"/><rect x="-30" y="-3.4" width="60" height="6.8" fill="#1d1f24"/><ellipse cx="-9" cy="-16" rx="10" ry="5" transform="rotate(-28 -9 -16)" fill="#fff" opacity=".6"/></g><circle r="28" fill="none" stroke="#1d1f24" stroke-width="3"/><circle r="9.6" fill="#1d1f24"/><circle r="6.6" fill="#fff"/></svg>'
)}`

const CROWN = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-1.6 9H4.6z" fill="#ffda55"/></svg>'
)}`

// Dela runs ~0.86em a capital: the size at which a name fits `room` px
const fitName = (name: string, room: number, max: number) =>
  Math.max(26, Math.min(max, Math.floor(room / (name.length * 0.86))))

export async function buildCompareCard(
  a: CardPokemon | null,
  b: CardPokemon | null
): Promise<Node> {
  const shared = await loadShared()
  const both = a && b
  const result = both ? shared.compareStats(a, b) : null
  const leader = shared.leaderOf(result)

  const portrait = (mon: CardPokemon | null, side: 'a' | 'b') =>
    h(
      'div',
      {
        position: 'absolute',
        top: 24,
        [side === 'a' ? 'left' : 'right']: 70,
        width: 330,
        height: 330,
        alignItems: 'center',
        justifyContent: 'center',
        // a soft spotlight behind the Pokémon
        backgroundImage:
          'radial-gradient(circle, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0) 66%)',
      },
      mon?.art
        ? h('img', { width: 300, height: 300 }, undefined, {
            src: mon.art,
            width: 300,
            height: 300,
          })
        : // nobody yet: a closed Poké Ball with a "?" badge on its shoulder
          h('div', { position: 'relative', width: 210, height: 210 }, [
            h('img', { width: 210, height: 210 }, undefined, {
              src: POKE_BALL,
              width: 210,
              height: 210,
            }),
            h(
              'div',
              {
                position: 'absolute',
                right: -14,
                top: -10,
                width: 76,
                height: 76,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 999,
                border: `5px solid ${INK}`,
                backgroundColor: YELLOW,
                fontFamily: DELA,
                fontSize: 42,
                color: INK,
              },
              '?'
            ),
          ])
    )

  const plate = (mon: CardPokemon | null, side: 'a' | 'b') => {
    const power = mon ? shared.getPokemonPower(mon.stats) : null
    const name = mon ? shared.pokemonLabel(mon.name) : 'Ai dám đấu?'
    const isLeader = leader === side
    return h(
      'div',
      {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        padding: '0 30px',
        backgroundColor: mixInk(SIDE[side], 0.34),
        backgroundImage: isLeader
          ? 'radial-gradient(ellipse at 50% 0%, rgba(255,218,85,0.3) 0%, rgba(255,218,85,0) 70%)'
          : 'none',
        borderLeft: side === 'b' ? '3px solid rgba(255,255,255,0.1)' : 'none',
      },
      [
        h('div', { alignItems: 'center', gap: 14 }, [
          ...(isLeader
            ? [
                h('img', { width: 44, height: 44 }, undefined, {
                  src: CROWN,
                  width: 44,
                  height: 44,
                }),
              ]
            : []),
          h(
            'div',
            {
              fontFamily: DELA,
              fontSize: fitName(name, isLeader ? 460 : 510, 50),
              color: mon ? '#fff' : 'rgba(255,255,255,0.75)',
              textTransform: 'uppercase',
              lineHeight: 1.1,
            },
            name
          ),
        ]),
        power
          ? h(
              'div',
              {
                alignItems: 'center',
                gap: 14,
                fontFamily: BODY,
                fontWeight: 800,
                fontSize: 28,
                color: '#fff',
              },
              [
                h(
                  'div',
                  {
                    padding: '4px 16px',
                    borderRadius: 10,
                    backgroundImage: `linear-gradient(160deg, ${power.color.a}, ${power.color.b})`,
                    color: INK,
                    fontFamily: DELA,
                    fontWeight: 400,
                    fontSize: 30,
                  },
                  power.rank
                ),
                `${power.bst} BST`,
              ]
            )
          : h(
              'div',
              {
                fontFamily: BODY,
                fontWeight: 700,
                fontSize: 26,
                color: 'rgba(255,255,255,0.7)',
              },
              'Chọn đối thủ trên Pokédex'
            ),
        h(
          'div',
          { gap: 10 },
          (mon?.types ?? []).map(({ type }) => {
            const info = shared.TYPE_DATA[type.name]
            return h(
              'div',
              {
                padding: '4px 16px',
                borderRadius: 999,
                backgroundColor: info?.color ?? '#9fa19f',
                color: '#fff',
                fontFamily: BODY,
                fontWeight: 800,
                fontSize: 22,
              },
              info?.label ?? type.name
            )
          })
        ),
      ]
    )
  }

  const one = a || b
  const strip = both
    ? shared.verdictOf(a, b)
    : one
      ? `${shared.pokemonLabel(one.name)} đang chờ đối thủ. Ai dám đấu?`
      : 'Ai mạnh hơn? Chọn cặp đấu và so tài ngay!'

  return h(
    'div',
    {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      flexDirection: 'column',
      backgroundColor: INK,
    },
    [
      // the arena: red | blue, split by a yellow diagonal seam
      h(
        'div',
        {
          position: 'relative',
          height: 380,
          backgroundImage: `linear-gradient(104deg, #b8260b 0%, ${SIDE.a} 49.2%, ${YELLOW} 49.2%, ${YELLOW} 50.8%, ${SIDE.b} 50.8%, #1d4fa8 100%)`,
        },
        [
          portrait(a, 'a'),
          portrait(b, 'b'),
          h(
            'div',
            {
              position: 'absolute',
              left: 540,
              top: 130,
              width: 120,
              height: 120,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 999,
              border: `7px solid ${INK}`,
              backgroundImage: `radial-gradient(circle at 35% 30%, #fff2b0, ${YELLOW} 55%, #f2b600)`,
              fontFamily: DELA,
              fontSize: 46,
              color: INK,
            },
            'VS'
          ),
        ]
      ),
      // the name plates, under a yellow rule like the page's
      h('div', { flex: 1, borderTop: `6px solid ${YELLOW}` }, [
        plate(a, 'a'),
        plate(b, 'b'),
      ]),
      // the verdict and where it comes from
      h(
        'div',
        {
          height: 74,
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 36px',
          backgroundColor: YELLOW,
          color: INK,
          fontFamily: BODY,
          fontWeight: 800,
        },
        [
          h('div', { fontSize: 30 }, strip),
          h('div', { alignItems: 'center', gap: 10, fontSize: 24 }, [
            h('img', { width: 34, height: 34 }, undefined, {
              src: POKE_BALL,
              width: 34,
              height: 34,
            }),
            'pokédex · so sánh',
          ]),
        ]
      ),
    ]
  )
}
