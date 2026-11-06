export const MY_POKEMON_PATH = '/pokemon-cua-toi'
export const OWNED_COLLECTION_PATH = '/?view=caught&owned=1'

/** The list, or one individual's page. */
export const myPokemonPath = (id) =>
  id ? `${MY_POKEMON_PATH}/${encodeURIComponent(id)}` : MY_POKEMON_PATH

export const findIndividual = (items, id) =>
  (id && items?.find((item) => item.id === id)) || null
