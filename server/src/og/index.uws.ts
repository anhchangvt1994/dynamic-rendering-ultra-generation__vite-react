import fs from 'fs'
import path from 'path'
import { TemplatedApp } from 'uWebSockets.js'
import ServerConfig from '../server.config'
import Console from '../utils/ConsoleHandler'
import { PROCESS_ENV } from '../utils/InitEnv'
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  CardPokemon,
  buildCompareCard,
  loadFonts,
} from './compareCard'

/**
 * GET /og/so-sanh.png, /og/so-sanh/<a>.png, /og/so-sanh/vs-<b>.png,
 * /og/so-sanh/<a>-vs-<b>.png: the share card (og:image) of the compare
 * page with the same path. Rendered once per pair (Satori → SVG → sharp →
 * PNG) and kept on disk; a card for an unknown name is served but not kept.
 */

// bump with SHARE_CARD_VERSION (src/pages/ComparePage) when the card changes
const CARD_VERSION = 1

// NOTE - Where the data comes from, per project: server/.env
// (POKEAPI_BASE_URL, POKEAPI_SPRITES_BASE_URL; see InitEnv's IProcessENV)
const baseUrl = (name: 'POKEAPI_BASE_URL' | 'POKEAPI_SPRITES_BASE_URL') => {
  const value = String(PROCESS_ENV[name] || '').trim()
  try {
    return new URL(value).href.replace(/\/+$/, '')
  } catch {
    Console.error(`Share cards are off: ${name} is not a URL in server/.env`)
    return ''
  }
}
const POKEAPI = baseUrl('POKEAPI_BASE_URL')
const SPRITES = baseUrl('POKEAPI_SPRITES_BASE_URL')
const FETCH_TIMEOUT_MS = Number(PROCESS_ENV.SHARE_CARD_FETCH_TIMEOUT_MS) || 8000
const MAX_RENDERS = Number(PROCESS_ENV.SHARE_CARD_MAX_RENDERS) || 2

const cacheDir = (() => {
  const root =
    ServerConfig.rootCache && fs.existsSync(ServerConfig.rootCache)
      ? ServerConfig.rootCache
      : '/tmp'
  const dir = path.join(root, 'og')
  fs.mkdirSync(dir, { recursive: true })
  return dir
})()

const fetchWithTimeout = async (url: string) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

// PokéAPI payloads, kept in memory (a card needs name, stats, types, ids)
const pokemonCache = new Map<string, Promise<any | null>>()
const fetchPokemon = (slug: string) => {
  if (!pokemonCache.has(slug)) {
    if (pokemonCache.size > 500) pokemonCache.clear()
    pokemonCache.set(
      slug,
      fetchWithTimeout(`${POKEAPI}/pokemon/${slug}`)
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => {
          pokemonCache.delete(slug) // a network blip: try again next time
          return null
        })
    )
  }
  return pokemonCache.get(slug) as Promise<any | null>
}

// NOTE - The portrait, best source first: PokéAPI lacks some recent forms'
// artwork (Koraidon's builds); the species' artwork is the last resort.
// Resized to the card's 300px so the SVG stays small.
const portraitOf = async (pokemon: any): Promise<string | undefined> => {
  const sharp = require('sharp')
  const speciesId = Number(pokemon.species?.url?.match(/\/(\d+)\/?$/)?.[1])
  const sources = [
    `${SPRITES}/other/official-artwork/${pokemon.id}.png`,
    `${SPRITES}/other/home/${pokemon.id}.png`,
    `${SPRITES}/${pokemon.id}.png`,
    ...(speciesId && speciesId !== pokemon.id
      ? [`${SPRITES}/other/official-artwork/${speciesId}.png`]
      : []),
  ]
  for (const url of sources) {
    try {
      const res = await fetchWithTimeout(url)
      if (!res.ok) continue
      const png = await sharp(Buffer.from(await res.arrayBuffer()))
        .resize(300, 300, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer()
      return `data:image/png;base64,${png.toString('base64')}`
    } catch {
      // next source
    }
  }
}

const toCardPokemon = async (slug: string): Promise<CardPokemon | null> => {
  if (!slug) return null
  const pokemon = await fetchPokemon(slug)
  if (!pokemon) return null
  return {
    name: pokemon.name,
    stats: pokemon.stats,
    types: pokemon.types,
    art: await portraitOf(pokemon),
  }
}

// a few renders at a time: each holds two decoded portraits and a raster
let running = 0
const waiting: (() => void)[] = []
const withRenderSlot = async <T>(work: () => Promise<T>) => {
  if (running >= MAX_RENDERS)
    await new Promise<void>((resolve) => waiting.push(resolve))
  running++
  try {
    return await work()
  } finally {
    running--
    waiting.shift()?.()
  }
}

const render = async (a: string, b: string) => {
  const satori = require('satori').default ?? require('satori')
  const sharp = require('sharp')
  const [left, right] = await Promise.all([toCardPokemon(a), toCardPokemon(b)])
  const tree = await buildCompareCard(left, right)
  const svg = await satori(tree, {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    fonts: loadFonts(),
  })
  const png = await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toBuffer()
  // every name was found: worth keeping
  const complete = (!a || left) && (!b || right)
  return { png, complete }
}

// one render per card, however many crawlers ask at once
const inflight = new Map<string, Promise<Buffer>>()
const cardFor = (a: string, b: string) => {
  const key = `${CARD_VERSION}-${a || '_'}-vs-${b || '_'}`
  const file = path.join(cacheDir, `${key}.png`)
  if (fs.existsSync(file)) return Promise.resolve(fs.readFileSync(file))
  if (!inflight.has(key))
    inflight.set(
      key,
      withRenderSlot(() => render(a, b))
        .then(({ png, complete }) => {
          if (complete)
            fs.promises.writeFile(file, png).catch((err) => Console.error(err))
          return png
        })
        .finally(() => inflight.delete(key))
    )
  return inflight.get(key) as Promise<Buffer>
}

const SLUG = /^[a-z0-9-]{1,40}$/

/** "/og/so-sanh/charizard-vs-blastoise.png" → { a, b }; null if malformed */
export const readCardPath = (url: string) => {
  if (url === '/og/so-sanh.png') return { a: '', b: '' }
  const match = url.match(/^\/og\/so-sanh\/([a-z0-9-]+)\.png$/)
  if (!match) return null
  const pair = match[1]
  const [a, b] = pair.startsWith('vs-')
    ? ['', pair.slice(3)]
    : pair.includes('-vs-')
      ? [
          pair.slice(0, pair.indexOf('-vs-')),
          pair.slice(pair.indexOf('-vs-') + 4),
        ]
      : [pair, '']
  if ((a && !SLUG.test(a)) || (b && !SLUG.test(b))) return null
  return { a, b }
}

const OgRouter = (() => {
  const handler = async (res, req) => {
    let aborted = false
    res.onAborted(() => {
      aborted = true
    })
    if (!POKEAPI || !SPRITES) {
      res.cork(() =>
        res.writeStatus('503 Service Unavailable').end('Share cards are off')
      )
      return
    }
    const pair = readCardPath(req.getUrl())
    if (!pair) {
      res.cork(() => res.writeStatus('404 Not Found').end('Not found'))
      return
    }
    try {
      const png = await cardFor(pair.a, pair.b)
      if (aborted) return
      res.cork(() =>
        res
          .writeStatus('200 OK')
          .writeHeader('Content-Type', 'image/png')
          // a card only changes with its design version (part of its key)
          .writeHeader(
            'Cache-Control',
            'public, max-age=86400, stale-while-revalidate=604800'
          )
          .end(png)
      )
    } catch (err) {
      Console.error('Share card failed:', err)
      if (!aborted)
        res.cork(() =>
          res.writeStatus('500 Internal Server Error').end('Card failed')
        )
    }
  }

  return {
    init(app: TemplatedApp) {
      app.get('/og/so-sanh.png', handler)
      app.get('/og/so-sanh/*', handler)
    },
  }
})()

export default OgRouter
