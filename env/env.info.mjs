export default {
  prefix: 'info',
  data: {
    pokemon: {
      stats_default: [
        {
          stat: { name: 'hp' },
        },
        {
          stat: { name: 'attack' },
        },
        {
          stat: { name: 'defense' },
        },
        {
          stat: { name: 'special-attack' },
        },
        {
          stat: { name: 'special-defense' },
        },
        {
          stat: { name: 'speed' },
        },
      ],
      stats_level: {
        bad: 50,
        normal: 99,
        good: 255,
      },
      stats_color: {
        bad: '#ff7f0f',
        normal: '#ffdd57',
        good: '#a0e515',
      },
      max_base_stats: 255,
    },
  },
}
