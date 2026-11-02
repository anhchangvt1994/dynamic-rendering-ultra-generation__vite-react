// Not signed in (production): the kitchen to look at, the public menu. To
// cook, the ingredients must be in an account's bag.
import { publicMenu } from '../menu.mjs'

export function createGuestEngine() {
  return {
    kind: 'guest',
    async menu() {
      return publicMenu()
    },
    async cook() {
      throw new Error('sign_in')
    },
    async dishes() {
      return {}
    },
  }
}
