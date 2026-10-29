// PokéAPI version_groups.csv "order", verified 2026-10-29.
// IDs 28/29 are late-added Gen 1 Japanese games, not newer releases.
// https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/version_groups.csv
const ORDER_BY_ID = {
  1: 3,
  2: 4,
  3: 5,
  4: 6,
  5: 7,
  6: 8,
  7: 11,
  8: 12,
  9: 13,
  10: 14,
  11: 15,
  12: 9,
  13: 10,
  14: 16,
  15: 17,
  16: 18,
  17: 19,
  18: 20,
  19: 21,
  20: 22,
  21: 23,
  22: 24,
  23: 25,
  24: 26,
  25: 27,
  26: 28,
  27: 29,
  28: 1,
  29: 2,
  30: 30,
  31: 31,
  32: 32,
}
export const versionOrder = (version) =>
  ORDER_BY_ID[Number(version?.url?.match(/\/(\d+)\/?$/)?.[1])] || 0
