export default {
  prefix: 'api',
  data: {
    proxy_url: {
      get: () => window.location.origin,
    },
    base_url: 'https://pokeapi.co/api/v2',
    path: {
      get_pokemon_list: '/pokemon',
      get_pokemon_detail: (name) => `/pokemon/${name}`,
    },
    reducer_path: {
      pokemon: 'pokemonApi',
    },
    endpoint: {
      get_pokemon_list: 'getPokemonList',
      get_pokemon_detail: 'getPokemonDetail',
    },
  },
}
