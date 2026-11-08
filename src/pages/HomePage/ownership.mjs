/** Species of the individuals, plus the dex's (a species evolved from stays owned). */
export function ownedSpecies(items = [], dexIds = []) {
  return new Set([...items.map((item) => item.speciesId), ...(dexIds ?? [])])
}

export function collectionIds(caughtIds, items = [], dexIds = []) {
  return new Set([...caughtIds, ...ownedSpecies(items, dexIds)])
}

export function latestOwned(items = [], speciesId) {
  return (
    items
      .filter((item) => item.speciesId === speciesId)
      .sort(
        (a, b) =>
          Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
          b.id.localeCompare(a.id)
      )[0] ?? null
  )
}

/** The owned badge's accessible name: how many, and that it opens the room. */
export const ownedLabel = (count, name) =>
  `Đang sở hữu ${count} ${name}, mở căn phòng`
