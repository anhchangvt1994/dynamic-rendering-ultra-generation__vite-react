// The mini game's calls to the account (minigame_* and trainer_* RPCs).
// A guest or the local mode has none: they practice (practice.mjs).
export const MINIGAME_ERRORS = {
  hungry: 'Pokémon đang đói, hãy cho ăn trước',
  no_turns: 'Hết lượt, đợi lượt mới nhé',
  round_open: 'Đang có một ván chưa xong',
  not_found: 'Không tìm thấy ván hoặc Pokémon này',
  round_closed: 'Ván đã hết giờ',
  not_finished: 'Ván chưa kết thúc',
  bad_index: 'Thẻ này không lật được',
  team_full: 'Đội đã đủ chỗ',
  not_eligible: 'Pokémon này chưa đủ điều kiện vào đội',
  locked: 'Nhân vật này chưa mở khóa',
  unavailable: 'Đăng nhập để chơi tính điểm',
  network: 'Mất kết nối, thử lại nhé',
}

const fail = (code) => {
  const known = code in MINIGAME_ERRORS
  return Object.assign(
    new Error(MINIGAME_ERRORS[known ? code : 'network']),
    { code: known ? code : 'network' }
  )
}

async function call({ mode, supabase }, name, args) {
  if (mode !== 'server') throw fail('unavailable')
  let reply
  try {
    reply = await supabase.rpc(name, args)
  } catch {
    throw fail('network')
  }
  if (reply.error) throw fail(reply.error.message)
  return reply.data
}

export const readStatus = (deps) => call(deps, 'minigame_status')

export const startRound = (deps, { game, individualId, difficulty }) =>
  call(deps, 'minigame_start', {
    p_game: game,
    p_individual: individualId,
    p_difficulty: difficulty,
  })

export const flipCard = (deps, { round, index }) =>
  call(deps, 'minigame_flip', { p_round: round, p_index: index })

export const finishRound = (deps, { round }) =>
  call(deps, 'minigame_finish', { p_round: round })

export const setAvatar = (deps, avatar) =>
  call(deps, 'trainer_set_avatar', { p_avatar: avatar })

export const setTeam = (deps, ids) =>
  call(deps, 'trainer_set_team', { p_team: ids })

/** Hunger, clock and affection of every Pokémon with a care row, by id. */
export async function readCares({ mode, supabase }) {
  if (mode !== 'server') throw fail('unavailable')
  let reply
  try {
    reply = await supabase
      .from('pokemon_care')
      .select('individual_id,hunger,needs_at,affection')
  } catch {
    throw fail('network')
  }
  if (reply.error) throw fail('network')
  return Object.fromEntries(
    reply.data.map((row) => [
      row.individual_id,
      {
        hunger: Number(row.hunger),
        needsAt: row.needs_at,
        affection: row.affection,
      },
    ])
  )
}
