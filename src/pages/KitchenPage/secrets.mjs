// The secret dishes: names and recipes found only in the pot. Never imported
// by the page in production (the local engine is dev only): the database
// keeps them (kitchen_recipes) and tells them once found.
// Their ids say nothing (bi-an-N): the menu sends them with the clues.
import { dishView } from './kitchen.mjs'

const SECRET = { secret: true }

export const SECRETS = [
  dishView(
    'bi-an-1',
    'Poffin Hoàng gia',
    'poffin',
    ['pomeg-berry', 'pecha-berry', 'moomoo-milk'],
    SECRET
  ),
  dishView(
    'bi-an-2',
    'Thạch biển Kelpsy',
    'jelly',
    ['kelpsy-berry', 'aspear-berry', 'fresh-water'],
    SECRET
  ),
  dishView(
    'bi-an-3',
    'Bánh kem Qualot',
    'cake',
    ['qualot-berry', 'big-malasada', 'shalour-sable'],
    SECRET
  ),
  dishView(
    'bi-an-4',
    'Cà ri Hondew',
    'curry',
    ['hondew-berry', 'rawst-berry', 'lava-cookie'],
    SECRET
  ),
  dishView(
    'bi-an-5',
    'Sinh tố Grepa',
    'smoothie',
    ['grepa-berry', 'lemonade', 'casteliacone'],
    SECRET
  ),
  dishView(
    'bi-an-6',
    'Súp lửa Tamato',
    'soup',
    ['tamato-berry', 'cheri-berry', 'cheri-berry'],
    SECRET
  ),
  dishView(
    'bi-an-7',
    'Pudding cổ điển',
    'pudding',
    ['old-gateau', 'pomeg-berry', 'moomoo-milk'],
    SECRET
  ),
  dishView(
    'bi-an-8',
    'Đại tiệc cầu vồng',
    'cake',
    ['pomeg-berry', 'kelpsy-berry', 'qualot-berry', 'hondew-berry'],
    { secret: true, rarity: 4 }
  ),
]
