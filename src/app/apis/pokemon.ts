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
        const limitFinal =
          RenderingInfo.type !== 'ISR' ? limit : Math.max(limit, 500)

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
      string | number
    >({
      keepUnusedDataFor: 300,
      query: (key) => {
        const pokemonDetailEndpoint = getPokemonDetailPath(key)

        return proxyApi.get(pokemonDetailEndpoint, {
          expiredTime: 'infinite',
          cacheKey: pokemonDetailEndpoint,
        })
      },
    }),
    // Species: genus, Pokédex flavour text, legendary flags, evolution link.
    getPokemonSpecies: builder.query<any, number | string>({
      keepUnusedDataFor: 300,
      query: (id) => {
        const endpoint = `/pokemon-species/${id}`
        return proxyApi.get(endpoint, {
          expiredTime: 'infinite',
          cacheKey: endpoint,
        })
      },
    }),
    // Ability text (effect, flavour), fetched when a reader opens it.
    getAbility: builder.query<any, string>({
      keepUnusedDataFor: 600,
      query: (name) => {
        const endpoint = `/ability/${name}`
        return proxyApi.get(endpoint, {
          expiredTime: 'infinite',
          cacheKey: endpoint,
        })
      },
    }),
    getEvolutionChain: builder.query<any, number>({
      keepUnusedDataFor: 300,
      query: (id) => {
        const endpoint = `/evolution-chain/${id}`
        return proxyApi.get(endpoint, {
          expiredTime: 'infinite',
          cacheKey: endpoint,
        })
      },
    }),
    getPokemonType: builder.query<any, string>({
      keepUnusedDataFor: 600,
      query: (type) => {
        const endpoint = `/type/${type}`
        return proxyApi.get(endpoint, {
          expiredTime: 'infinite',
          cacheKey: endpoint,
        })
      },
    }),
    getPokemonForm: builder.query<any, string>({
      keepUnusedDataFor: 600,
      query: (name) => {
        const endpoint = `/pokemon-form/${name}`
        return proxyApi.get(endpoint, {
          expiredTime: 'infinite',
          cacheKey: endpoint,
        })
      },
    }),
  }),
})

export const {
  useGetPokemonListQuery,
  useLazyGetPokemonListQuery,
  useGetPokemonDetailQuery,
  useGetPokemonSpeciesQuery,
  useGetEvolutionChainQuery,
  useGetAbilityQuery,
  useGetPokemonTypeQuery,
  useGetPokemonFormQuery,
} = pokemonApi

export default pokemonApi
