import {
  getApiProxyUrl,
  getPokemonDetailPath,
  getPokemonListPath,
} from 'utils/ApiHelper'

const proxyApi = ProxyAPI.init({
  targetBaseUrl: import.meta.env.API_BASE_URL,
})

const pokemonApi = createApi({
  reducerPath: import.meta.env.API_REDUCER_PATH_POKEMON,
  baseQuery: fetchBaseQuery({
    baseUrl: getApiProxyUrl(),
  }),
  endpoints: (builder) => ({
    [import.meta.env.API_ENDPOINT_GET_POKEMON_LIST]: builder.query<
      any,
      { limit: number; offset: number }
    >({
      query: ({ limit, offset }) => {
        const limitFinal = RenderingInfo.type !== 'ISR' ? limit : 200

        const pokemonListEndpoint = getPokemonListPath(limitFinal, offset)
        return proxyApi.get(pokemonListEndpoint, {
          expiredTime: RenderingInfo.type !== 'ISR' ? 'infinite' : 0,
          cacheKey: pokemonListEndpoint,
          enableStore: RenderingInfo.type !== 'ISR',
        })
      },
    }),
    [import.meta.env.API_ENDPOINT_GET_POKEMON_DETAIL]: builder.query<
      any,
      string
    >({
      query: (name) => {
        const pokemonDetailEndpoint = getPokemonDetailPath(name)

        return proxyApi.get(pokemonDetailEndpoint, {
          expiredTime: 'infinite',
          cacheKey: pokemonDetailEndpoint,
        })
      },
    }),
  }),
})

export const { useGetPokemonListQuery, useGetPokemonDetailQuery } = pokemonApi

export default pokemonApi
