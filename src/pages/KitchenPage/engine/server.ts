import type { CookResult, KitchenEngine, Menu } from './types'

// the RPCs of supabase/migrations/20261104000000_kitchen.sql
type Client = {
  rpc: (
    name: string,
    args?: Record<string, unknown>
  ) => PromiseLike<{ data: any; error: { message: string } | null }>
  from: (table: string) => {
    select: (
      columns: string
    ) => PromiseLike<{ data: any; error: { message: string } | null }>
  }
}

/** The account's kitchen: every cook decided by the database. */
export function createServerEngine(supabase: Client): KitchenEngine {
  const call = async (name: string, args?: Record<string, unknown>) => {
    const { data, error } = await supabase.rpc(name, args)
    if (error) throw new Error(error.message)
    return data
  }
  return {
    kind: 'server',
    async menu(): Promise<Menu> {
      return call('kitchen_menu')
    },
    async cook(dish, pot): Promise<CookResult> {
      return call('kitchen_cook', { p_dish: dish, p_ingredients: pot })
    },
    async dishes() {
      const { data, error } = await supabase
        .from('kitchen_dishes')
        .select('dish_id, count')
      if (error) throw new Error(error.message)
      return Object.fromEntries(
        (data as { dish_id: string; count: number }[]).map((row) => [
          row.dish_id,
          row.count,
        ])
      )
    },
  }
}
