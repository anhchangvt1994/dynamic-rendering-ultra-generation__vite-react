/** Background crop of piece `index` out of a square artwork covering a cols x rows frame of square cells (centre crop). */
export const tileStyle = (index, cols, rows) => {
  const side = Math.max(cols, rows)
  const at = (i, count) => (side > 1 ? ((i + (side - count) / 2) / (side - 1)) * 100 : 0)
  return {
    backgroundSize: `${side * 100}% ${side * 100}%`,
    backgroundPosition: `${at(index % cols, cols)}% ${at(Math.floor(index / cols), rows)}%`,
  }
}

/** Frame cell under a pointer, or null outside the frame. */
export const cellAt = (x, y, rect, cols, rows) => {
  const col = Math.floor(((x - rect.left) / rect.width) * cols)
  const row = Math.floor(((y - rect.top) / rect.height) * rows)
  return col < 0 || row < 0 || col >= cols || row >= rows ? null : row * cols + col
}
