// An individual's build lives on the server only (pokemon_build and friends);
// the browser sends an operation id and a choice, never a computed value.
export const BUILD_ERRORS = {
  not_found: 'Không tìm thấy Pokémon này',
  operation_conflict: 'Thao tác bị trùng, thử lại nhé',
  build_unavailable: 'Đăng nhập để xem chỉ số',
  network: 'Mất kết nối, thử lại nhé',
}

const KNOWN = [
  'item_limit',
  'iv_maxed',
  'level_capped',
  'no_item',
  'not_learnable',
  'locked',
  'duplicate',
  'not_ready',
  'max_stars',
  'already_awakened',
]
const MESSAGES = {
  item_limit: 'Đã dùng đủ 3 vật phẩm',
  iv_maxed: 'Chỉ số này đã tối đa',
  level_capped: 'Đã chạm trần cấp',
  no_item: 'Không có vật phẩm này',
  not_learnable: 'Loài này không học được chiêu đó',
  locked: 'Chưa đủ điều kiện học chiêu này',
  duplicate: 'Chiêu đã nằm ở ô khác',
  not_ready: 'Cần thân thiết cấp 10',
  max_stars: 'Đã đủ 5 sao',
  already_awakened: 'Đã thức tỉnh rồi',
}

const fail = (message = '') => {
  const code = [...KNOWN, 'not_found', 'operation_conflict'].find((c) =>
    message.includes(c)
  )
  return Object.assign(
    new Error(MESSAGES[code] ?? BUILD_ERRORS[code] ?? BUILD_ERRORS.network),
    { code: code ?? 'network' }
  )
}

const needServer = ({ mode, supabase }) => {
  if (mode !== 'server' || !supabase) {
    throw Object.assign(new Error(BUILD_ERRORS.build_unavailable), {
      code: 'build_unavailable',
    })
  }
}

async function call({ mode, supabase }, name, args) {
  needServer({ mode, supabase })
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw fail(error.message)
  return data
}

export const fetchBuild = (deps, individualId) =>
  call(deps, 'pokemon_build', { p_individual: individualId })

export const setMove = (deps, operationId, individualId, slot, move) =>
  call(deps, 'pokemon_set_move', {
    p_operation: operationId,
    p_individual: individualId,
    p_slot: slot,
    p_move: move,
  })

export const useItem = (deps, operationId, individualId, item, stat = null) =>
  call(deps, 'pokemon_use_item', {
    p_operation: operationId,
    p_individual: individualId,
    p_item: item,
    p_stat: stat,
  })

export const awaken = (deps, operationId, individualId) =>
  call(deps, 'pokemon_awaken', {
    p_operation: operationId,
    p_individual: individualId,
  })
