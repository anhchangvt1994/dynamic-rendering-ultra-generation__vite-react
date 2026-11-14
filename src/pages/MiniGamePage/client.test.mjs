import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MINIGAME_ERRORS,
  claimQuest,
  finishRound,
  flipCard,
  removeTilePair,
  shuffleTiles,
  spinLucky,
  readCares,
  readStatus,
  setAvatar,
  uploadAvatar,
  saveTeams,
  switchTeam,
  setTeam,
  startRound,
} from './client.mjs'

const fake = (rpc) => {
  const calls = []
  return {
    calls,
    rpc: async (name, args) => {
      calls.push({ name, args })
      if (rpc instanceof Error) throw rpc
      return rpc
    },
  }
}
const server = (supabase) => ({ mode: 'server', supabase })

test('each call maps to its RPC and returns the data', async () => {
  const supabase = fake({ data: { ok: 1 }, error: null })
  const deps = server(supabase)
  await readStatus(deps)
  await startRound(deps, { game: 'memory', individualId: 'i1', difficulty: 2 })
  await flipCard(deps, { round: 'r1', index: 4 })
  await removeTilePair(deps, { round: 'r1', a: 2, b: 5 })
  await shuffleTiles(deps, { round: 'r1' })
  await spinLucky(deps, { round: 'r1' })
  await finishRound(deps, { round: 'r1' })
  await finishRound(deps, { round: 'r2', moves: [[120, 0], [800, 5]] })
  await finishRound(deps, { round: 'r3', moves: [[10, 8], [20, 7]] })
  await setAvatar(deps, 'scout')
  await uploadAvatar(deps, 'data:image/webp;base64,AAAA')
  await setTeam(deps, ['a', 'b'])
  await saveTeams(deps, [{ slot: 1, name: 'x', members: ['a'] }], 1)
  await switchTeam(deps, 3)
  await claimQuest(deps, { slot: 2 })
  assert.deepEqual(supabase.calls, [
    { name: 'minigame_status', args: undefined },
    {
      name: 'minigame_start',
      args: { p_game: 'memory', p_individual: 'i1', p_difficulty: 2 },
    },
    { name: 'minigame_flip', args: { p_round: 'r1', p_index: 4 } },
    { name: 'minigame_tile_remove', args: { p_round: 'r1', p_a: 2, p_b: 5 } },
    { name: 'minigame_tile_shuffle', args: { p_round: 'r1' } },
    { name: 'minigame_spin', args: { p_round: 'r1' } },
    { name: 'minigame_finish', args: { p_round: 'r1' } },
    { name: 'minigame_finish', args: { p_round: 'r2', p_moves: [[120, 0], [800, 5]] } },
    { name: 'minigame_finish', args: { p_round: 'r3', p_moves: [[10, 8], [20, 7]] } },
    { name: 'trainer_set_avatar', args: { p_avatar: 'scout' } },
    { name: 'trainer_upload_avatar', args: { p_image: 'data:image/webp;base64,AAAA' } },
    { name: 'trainer_set_team', args: { p_team: ['a', 'b'] } },
    { name: 'trainer_save_teams', args: { p_teams: [{ slot: 1, name: 'x', members: ['a'] }], p_active: 1 } },
    { name: 'trainer_switch_team', args: { p_slot: 3 } },
    { name: 'minigame_quest_claim', args: { p_slot: 2 } },
  ])
  assert.deepEqual(await readStatus(deps), { ok: 1 })
})

test('a P0001 message that is a known code keeps it, in Vietnamese', async () => {
  for (const code of Object.keys(MINIGAME_ERRORS)) {
    if (code === 'network' || code === 'unavailable') continue
    const deps = server(fake({ data: null, error: { message: code } }))
    await assert.rejects(startRound(deps, { game: 'memory', individualId: 'x', difficulty: 1 }), {
      code,
      message: MINIGAME_ERRORS[code],
    })
  }
})

test('an unknown error is the network one', async () => {
  const deps = server(fake({ data: null, error: { message: 'Failed to fetch' } }))
  await assert.rejects(readStatus(deps), { code: 'network', message: MINIGAME_ERRORS.network })
})

test('a thrown fetch failure is the network one', async () => {
  const deps = server(fake(new TypeError('Failed to fetch')))
  await assert.rejects(flipCard(deps, { round: 'r', index: 0 }), { code: 'network' })
})

test('any mode but server is unavailable and calls nothing', async () => {
  for (const mode of ['guest', 'local', 'checking']) {
    const supabase = fake({ data: {}, error: null })
    await assert.rejects(readStatus({ mode, supabase }), { code: 'unavailable' })
    assert.equal(supabase.calls.length, 0)
  }
})

test('finishRound sends the moves only when given', async () => {
  const supabase = fake({ data: { ok: 1 }, error: null })
  const deps = server(supabase)
  await finishRound(deps, { round: 'r1', moves: [[0, 1], [6, 7]] })
  await finishRound(deps, { round: 'r2', moves: [] })
  assert.deepEqual(supabase.calls, [
    { name: 'minigame_finish', args: { p_round: 'r1', p_moves: [[0, 1], [6, 7]] } },
    { name: 'minigame_finish', args: { p_round: 'r2', p_moves: [] } },
  ])
})

test('bad_move has its Vietnamese message', () => {
  assert.equal(MINIGAME_ERRORS.bad_move, 'Nước đi không hợp lệ')
})

test('the error copy covers every code the database raises', () => {
  for (const code of ['hungry', 'no_turns', 'round_open', 'not_found', 'round_closed', 'not_finished', 'bad_index', 'team_full', 'not_eligible', 'locked', 'not_done', 'bad_slot', 'bad_move', 'network'])
    assert.ok(MINIGAME_ERRORS[code], code)
})

test('readCares turns the care rows into a map by individual', async () => {
  const supabase = {
    from: () => ({
      select: async () => ({
        data: [
          { individual_id: 'a', hunger: '55.50', needs_at: '2026-11-11T00:00:00Z', affection: 12 },
        ],
        error: null,
      }),
    }),
  }
  assert.deepEqual(await readCares({ mode: 'server', supabase }), {
    a: { hunger: 55.5, needsAt: '2026-11-11T00:00:00Z', affection: 12 },
  })
  await assert.rejects(readCares({ mode: 'guest', supabase }), { code: 'unavailable' })
})
