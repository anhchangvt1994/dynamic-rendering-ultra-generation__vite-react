export type StatKey =
  'power' | 'beauty' | 'happiness' | 'agility' | 'wisdom' | 'friendship'

/** A dish as the menu shows it: in full once known, a clue while secret. */
export type DishView = {
  id: string
  kind: string
  secret: boolean
  known: boolean
  rarity: number
  top: StatKey[]
  // known
  name?: string
  ingredients?: string[]
  stats?: Partial<Record<StatKey, number>>
  // a secret's clue
  count?: number
  groups?: Partial<Record<'berry' | 'drink' | 'sweet', number>>
  /** each flavour's level (0 to 2): the secret's shadow in the pot */
  shape?: Record<'spicy' | 'dry' | 'sweet' | 'bitter' | 'sour', number>
}

export type Menu = {
  dishes: DishView[]
  /** secret dishes found */
  found: number
  /** the pots that failed, each sorted */
  attempts: string[][]
}

export type CookResult =
  | {
      outcome: 'dish'
      dish: DishView
      discovered: boolean
      /** the portions cooked (a batch of a menu dish) */
      count: number
    }
  | { outcome: 'failed'; returned: string[]; near: number }

/** The kitchen behind the page: the account's, this browser's, a guest's. */
export interface KitchenEngine {
  kind: 'server' | 'local' | 'guest'
  menu(): Promise<Menu>
  /** a dish of the menu (dish), `times` portions of it (1 to 99), or a pot
   * of 2 to 4 ingredients (one at a time) */
  cook(
    dish: string | null,
    pot: string[] | null,
    times?: number
  ): Promise<CookResult>
  /** the dishes cooked, by id */
  dishes(): Promise<Record<string, number>>
}
