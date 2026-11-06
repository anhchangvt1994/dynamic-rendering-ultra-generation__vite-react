const ROOM = /^\/pokemon-cua-toi\/[^/?#]+$/

/**
 * The room the cook came from, read from the router state: only a path to
 * one room is trusted, anything else is no way back.
 * @param {unknown} state
 * @returns {string | null}
 */
export function roomReturn(state) {
  const to =
    state && typeof state === 'object'
      ? /** @type {{ returnTo?: unknown }} */ (state).returnTo
      : null
  return typeof to === 'string' && ROOM.test(to) ? to : null
}
