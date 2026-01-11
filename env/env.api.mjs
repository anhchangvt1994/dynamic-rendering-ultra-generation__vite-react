export default {
  prefix: 'api',
  data: {
    proxy_url: 'http://localhost:8080',
    base_url: 'https://pokeapi.co/api/v2',
    path: {
      get_pokemon_list: '/pokemon',
      get_pokemon_detail: '/pokemon/$id',
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
