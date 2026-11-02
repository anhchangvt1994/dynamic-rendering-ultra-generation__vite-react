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
}

export type Menu = {
  dishes: DishView[]
  /** secret dishes found */
  found: number
  /** the pots that failed, each sorted */
  attempts: string[][]
}

export type CookResult =
  | { outcome: 'dish'; dish: DishView; discovered: boolean }
  | { outcome: 'failed'; returned: string[]; near: number }

/** The kitchen behind the page: the account's, this browser's, a guest's. */
export interface KitchenEngine {
  kind: 'server' | 'local' | 'guest'
  menu(): Promise<Menu>
  /** a dish of the menu (dish), or a pot of 2 to 4 ingredients */
  cook(dish: string | null, pot: string[] | null): Promise<CookResult>
  /** the dishes cooked, by id */
  dishes(): Promise<Record<string, number>>
}
