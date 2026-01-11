const proxyApi = ProxyAPI.init({
  targetBaseUrl: import.meta.env.API_BASE_URL,
})

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
  }),
})

export const { useGetPokemonListQuery } = pokemonApi

export default pokemonApi
