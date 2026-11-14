// The mini game's calls to the account (minigame_* and trainer_* RPCs).
// A guest or the local mode has none: they practice (practice.mjs).
export const MINIGAME_ERRORS = {
  hungry: 'Pokémon đang đói, hãy cho ăn trước',
  no_turns: 'Hết lượt, đợi lượt mới nhé',
  round_open: 'Đang có một ván chưa xong',
  not_found: 'Không tìm thấy ván hoặc Pokémon này',
  round_closed: 'Ván đã hết giờ',
  not_finished: 'Ván chưa kết thúc',
  bad_move: 'Nước đi không hợp lệ',
  bad_pair: 'Hai ô này chưa nối được bằng đường tối đa 2 lần rẽ',
  no_shuffles: 'Đã hết lượt xáo bàn',
  bad_answer: 'Lựa chọn Pokémon không hợp lệ',
  bad_index: 'Thẻ này không lật được',
  team_full: 'Đội đã đủ chỗ',
  not_eligible: 'Pokémon này chưa đủ điều kiện vào đội',
  locked: 'Nhân vật này chưa mở khóa',
  bad_teams: 'Danh sách đội hình không hợp lệ',
  duplicate: 'Một Pokémon bị chọn hai lần trong cùng đội',
  bad_avatar: 'Avatar này không dùng được',
  bad_image: 'Ảnh không hợp lệ hoặc quá nặng',
  not_done: 'Nhiệm vụ chưa xong',
  bad_slot: 'Nhiệm vụ không hợp lệ',
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

export const removeTilePair = (deps, { round, a, b }) =>
  call(deps, 'minigame_tile_remove', { p_round: round, p_a: a, p_b: b })

export const shuffleTiles = (deps, { round }) =>
  call(deps, 'minigame_tile_shuffle', { p_round: round })

export const spinLucky = (deps, { round }) =>
  call(deps, 'minigame_spin', { p_round: round })

export const finishRound = (deps, { round, moves = undefined }) =>
  call(
    deps,
    'minigame_finish',
    moves === undefined ? { p_round: round } : { p_round: round, p_moves: moves }
  )

export const claimQuest = (deps, { slot }) =>
  call(deps, 'minigame_quest_claim', { p_slot: slot })

export const setAvatar = (deps, avatar) =>
  call(deps, 'trainer_set_avatar', { p_avatar: avatar })

export const uploadAvatar = (deps, image) =>
  call(deps, 'trainer_upload_avatar', { p_image: image })

/** The trainer's own picture (a data URL), or null. */
export async function readAvatarImage({ mode, supabase }) {
  if (mode !== 'server') throw fail('unavailable')
  let reply
  try {
    reply = await supabase.from('trainer_avatar_images').select('image').maybeSingle()
  } catch {
    throw fail('network')
  }
  if (reply.error) throw fail('network')
  return reply.data?.image ?? null
}

export const setTeam = (deps, ids) =>
  call(deps, 'trainer_set_team', { p_team: ids })

export const saveTeams = (deps, teams, active) =>
  call(deps, 'trainer_save_teams', { p_teams: teams, p_active: active })

export const switchTeam = (deps, slot) =>
  call(deps, 'trainer_switch_team', { p_slot: slot })

/** Every team (slot, name, members) and the active slot. */
export async function readTeams({ mode, supabase }) {
  if (mode !== 'server') throw fail('unavailable')
  let teams, profile
  try {
    teams = await supabase.from('trainer_teams').select('slot,name,members').order('slot')
    profile = await supabase.from('trainer_profiles').select('active_team').maybeSingle()
  } catch {
    throw fail('network')
  }
  if (teams.error || profile.error) throw fail('network')
  return { rows: teams.data, active: profile.data?.active_team ?? 1 }
}

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
