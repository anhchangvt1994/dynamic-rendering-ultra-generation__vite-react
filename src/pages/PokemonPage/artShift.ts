import centers from './artCenters.json'

/** Offset of the character from its canvas centre, in canvas sides (see artCenter.mjs). */
export const artOffset = (id: number): [number, number] => {
  const [x, y] = (centers as unknown as Record<string, [number, number]>)[id] ?? [0, 0]
  return [x / 1000, y / 1000]
}
