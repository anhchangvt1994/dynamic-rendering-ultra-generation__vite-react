import { ITEMS } from 'pages/QuizPage/items.mjs'
import { titleCase } from '../build/format.mjs'

export const itemName = (id: string) =>
  (ITEMS as { id: string; name: string }[]).find((i) => i.id === id)?.name ??
  titleCase(id)
