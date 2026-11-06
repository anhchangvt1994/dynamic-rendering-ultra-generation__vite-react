/**
 * Hand fixes per species for the rig: `clusters` replaces k-means with these
 * centres (main region first), `noMarks` draws no marks on that species.
 * Spinda (327) has its own spots; Vileplume (45) is mostly flower.
 */
export type RigOverride = { clusters?: string[]; noMarks?: true }

const overrides: Record<string, RigOverride> = {
  '45': { noMarks: true },
  '327': { noMarks: true },
}

export default overrides
