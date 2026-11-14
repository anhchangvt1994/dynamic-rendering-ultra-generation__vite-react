export const rowsForMemoryBoard = (cards, columns) =>
  Math.ceil(Math.max(0, cards) / Math.max(1, columns))

export const newlyMatched = (before, after) => {
  const previous = new Set(before)
  return after.filter((index) => !previous.has(index))
}
