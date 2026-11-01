// "Who's That Pokémon?" played on the server: the browser never learns a
// round's answer before answering, so it can not load the artwork or the
// cry by their Pokédex number. It asks for /api/quiz-art/<round> and
// /api/quiz-cry/<round>; this looks the answer up with the service role
// (quiz_art, supabase/migrations/20261101000000_quiz_game.sql) and serves the
// file itself. Framework free: the express, fastify and uWS routes wrap it.

export type QuizMediaConfig = {
  /** the Supabase API, reachable from this server */
  url: string
  /** the service role key: never sent to the browser */
  key: string
  /** POKEAPI_SPRITES_BASE_URL (…/sprites/pokemon) */
  sprites: string
}

export type QuizMedia = {
  status: number
  type: string
  body: Uint8Array
}

type Fetch = typeof fetch

const ROUND_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CRIES =
  'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest'
const TIMEOUT_MS = 8000

export const isRoundId = (value: string) => ROUND_ID.test(value || '')

const text = (status: number, body: string): QuizMedia => ({
  status,
  type: 'text/plain; charset=utf-8',
  body: new TextEncoder().encode(body),
})

const rpc = (
  name: string,
  round: string,
  config: QuizMediaConfig,
  fetchImpl: Fetch
) =>
  fetchImpl(`${config.url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_round: round }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })

/** The answer behind a round, or null (unknown round, bad id, refused). */
export async function answerFor(
  round: string,
  config: QuizMediaConfig,
  fetchImpl: Fetch = fetch
): Promise<number | null> {
  if (!isRoundId(round) || !config.url || !config.key) return null
  try {
    const response = await rpc('quiz_art', round, config, fetchImpl)
    if (!response.ok) return null
    const id = Number(await response.json())
    return Number.isInteger(id) && id >= 1 && id <= 1025 ? id : null
  } catch {
    return null
  }
}

/** A round's artwork (`art`) or cry (`cry`), as a response to send. */
export async function mediaFor(
  kind: 'art' | 'cry',
  round: string,
  config: QuizMediaConfig,
  fetchImpl: Fetch = fetch
): Promise<QuizMedia> {
  if (!config.url || !config.key) return text(503, 'The quiz is off')
  const id = await answerFor(round, config, fetchImpl)
  if (id === null) return text(404, 'Not found')
  const source =
    kind === 'art'
      ? `${config.sprites.replace(/\/+$/, '')}/other/official-artwork/${id}.png`
      : `${CRIES}/${id}.ogg`
  try {
    const response = await fetchImpl(source, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (response.ok)
      return {
        status: 200,
        type: kind === 'art' ? 'image/png' : 'audio/ogg',
        body: new Uint8Array(await response.arrayBuffer()),
      }
  } catch {
    // told below
  }
  // NOTE - Only a broken artwork lets the player swap the Pokémon for free
  // (quiz_reroll): the database learns it from here, never from the page
  if (kind === 'art')
    await rpc('quiz_art_failed', round, config, fetchImpl).catch(() => {})
  return text(502, 'Upstream failed')
}

// the round's own media: private to whoever holds the id, kept a while
export const MEDIA_CACHE = 'private, max-age=900'

/** "/api/quiz-art/<round>" → { kind, round }, null if it is not one */
export function readMediaPath(url: string) {
  const match = (url || '').match(/^\/api\/quiz-(art|cry)\/([^/?#]+)/)
  if (!match) return null
  return { kind: match[1] as 'art' | 'cry', round: match[2] }
}
