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

/**
 * What the server validates a species' moves against, read-only and public:
 * learnset rows (a machine row carries the TM item) and each move's data.
 */
export async function fetchLearnset({ mode, supabase }, species) {
  needServer({ mode, supabase })
  const [learn, machines] = await Promise.all([
    supabase
      .from('pokemon_learnset')
      .select('move, method, level')
      .eq('species', species),
    supabase.from('pokemon_machines').select('item_id, move'),
  ])
  if (learn.error || machines.error) throw fail('network')
  const itemOf = Object.fromEntries(
    machines.data.map((row) => [row.move, row.item_id])
  )
  const learnset = learn.data
    .map((row) => ({
      move: row.move,
      method: row.method,
      level: row.level,
      item: row.method === 'machine' ? itemOf[row.move] : undefined,
    }))
    // a machine move with no TM in the catalogue can't be set yet
    .filter((row) => row.method !== 'machine' || row.item)
  const names = [...new Set(learn.data.map((row) => row.move))]
  const { data, error } = await supabase
    .from('pokemon_moves_ref')
    .select('move, type, power, accuracy, pp, damage_class')
    .in('move', names)
  if (error) throw fail('network')
  const moves = Object.fromEntries(
    data.map((row) => [
      row.move,
      {
        type: row.type,
        power: row.power,
        accuracy: row.accuracy,
        pp: row.pp,
        damageClass: row.damage_class,
      },
    ])
  )
  return { learnset, moves }
}
