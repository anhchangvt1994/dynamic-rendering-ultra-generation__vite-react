// Evolution is decided on the server (pokemon_evolution_options / pokemon_evolve);
// the browser sends an operation id and a choice, never a computed value.
export const EVOLUTION_ERRORS = {
  not_eligible: 'Chưa đủ điều kiện tiến hoá',
  no_item: 'Không có vật phẩm này',
  invalid_branch: 'Dạng tiến hoá này không hợp lệ',
  operation_conflict: 'Thao tác bị trùng, thử lại nhé',
  not_found: 'Không tìm thấy Pokémon này',
  network: 'Mất kết nối, thử lại nhé',
  evolution_unavailable: 'Đăng nhập để tiến hoá Pokémon',
}

const fail = (message = '') => {
  const code = Object.keys(EVOLUTION_ERRORS).find(
    (c) => c !== 'network' && c !== 'evolution_unavailable' && message.includes(c)
  )
  return Object.assign(new Error(EVOLUTION_ERRORS[code] ?? EVOLUTION_ERRORS.network), {
    code: code ?? 'network',
  })
}

async function call({ mode, supabase }, name, args) {
  if (mode !== 'server' || !supabase) {
    throw Object.assign(new Error(EVOLUTION_ERRORS.evolution_unavailable), {
      code: 'evolution_unavailable',
    })
  }
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw fail(error.message)
  return data
}

export const fetchEvolutionOptions = (deps, individualId, context = {}) =>
  call(deps, 'pokemon_evolution_options', {
    p_individual: individualId,
    p_context: context,
  })

export const sendEvolve = (
  deps,
  operationId,
  individualId,
  branch,
  { context = {}, item = null } = {}
) =>
  call(deps, 'pokemon_evolve', {
    p_operation: operationId,
    p_individual: individualId,
    p_branch: branch,
    p_context: context,
    p_item: item,
  })
