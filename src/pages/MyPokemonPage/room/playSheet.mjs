import { canPlay } from '../../MiniGamePage/minigame.mjs'

/** Why the room's play button is off, or null when it can be used. */
export const playDisabledReason = ({ hunger }) =>
  canPlay(hunger) ? null : 'Đang đói, hãy cho ăn trước'
