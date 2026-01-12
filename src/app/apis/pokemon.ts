import { functionGenerator } from 'utils/EnvHelper'

const proxyApi = ProxyAPI.init({
  targetBaseUrl: import.meta.env.API_BASE_URL,
})

const getPokemonDetailPath = functionGenerator(
  import.meta.env.API_PATH_GET_POKEMON_DETAIL_FUNCTION
)

const pokemonApi = createApi({
  reducerPath: import.meta.env.API_REDUCER_PATH_POKEMON,
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.API_PROXY_URL,
  }),
  endpoints: (builder) => ({
    [import.meta.env.API_ENDPOINT_GET_POKEMON_LIST]: builder.query<any, void>({
      query: () =>
        proxyApi.get(import.meta.env.API_PATH_GET_POKEMON_LIST, {
          expiredTime: 60000,
          cacheKey: import.meta.env.API_ENDPOINT_GET_POKEMON_LIST,
          enableStore: true,
          relativeCacheKey: [import.meta.env.API_ENDPOINT_GET_POKEMON_LIST],
        }),
    }),
    [import.meta.env.API_ENDPOINT_GET_POKEMON_DETAIL]: builder.query<
      any,
      string
    >({
      query: (name) => {
        const pokemonDetailEndpoint = getPokemonDetailPath(name)

        return proxyApi.get(pokemonDetailEndpoint, {
          expiredTime: 60000,
          cacheKey: pokemonDetailEndpoint,
          enableStore: true,
          relativeCacheKey: [pokemonDetailEndpoint],
        })
      },
    }),
  }),
})

export const { useGetPokemonListQuery, useGetPokemonDetailQuery } = pokemonApi

export default pokemonApi
