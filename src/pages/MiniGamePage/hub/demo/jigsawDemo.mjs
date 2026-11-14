import { TURN, apply, initialState, isSolved } from '../../games/silhouette-atelier/engine.mjs'

export const JIGSAW_DEMO = { cols: 3, rows: 2, art: 25, rot: [0, 1, 0, 2, 0, 3], steps: [[0, 0], [2, 2], [1, 1], [1, TURN], [1, TURN], [1, TURN], [3, TURN], [3, TURN], [3, 3], [4, 4], [5, TURN], [5, 5]] }

/** One real action per frame, starting from the tray; the last frame is solved. */
export function jigsawFrames({ rot, steps } = JIGSAW_DEMO) {
  let state = initialState(rot)
  const frames = [{ state, moved: null }]
  for (const [piece, code] of steps) {
    state = apply(state, piece, code)
    frames.push({ state, moved: piece })
  }
  return frames
}
export { isSolved }
