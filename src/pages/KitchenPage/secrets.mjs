// The secret dishes: names and recipes found only in the pot. Never imported
// by the page in production (the local engine is dev only): the database
// keeps them (kitchen_recipes) and tells them once found.
import { dishView } from './kitchen.mjs'

const SECRET = { secret: true }

export const SECRETS = [
  dishView(
    'poffin-hoang-gia',
    'Poffin Hoàng gia',
    'poffin',
    ['pomeg-berry', 'pecha-berry', 'moomoo-milk'],
    SECRET
  ),
  dishView(
    'thach-bien-kelpsy',
    'Thạch biển Kelpsy',
    'jelly',
    ['kelpsy-berry', 'aspear-berry', 'fresh-water'],
    SECRET
  ),
  dishView(
    'banh-kem-qualot',
    'Bánh kem Qualot',
    'cake',
    ['qualot-berry', 'big-malasada', 'shalour-sable'],
    SECRET
  ),
  dishView(
    'ca-ri-hondew',
    'Cà ri Hondew',
    'curry',
    ['hondew-berry', 'rawst-berry', 'lava-cookie'],
    SECRET
  ),
  dishView(
    'sinh-to-grepa',
    'Sinh tố Grepa',
    'smoothie',
    ['grepa-berry', 'lemonade', 'casteliacone'],
    SECRET
  ),
  dishView(
    'sup-lua-tamato',
    'Súp lửa Tamato',
    'soup',
    ['tamato-berry', 'cheri-berry', 'cheri-berry'],
    SECRET
  ),
  dishView(
    'pudding-co-dien',
    'Pudding cổ điển',
    'pudding',
    ['old-gateau', 'pomeg-berry', 'moomoo-milk'],
    SECRET
  ),
  dishView(
    'dai-tiec-cau-vong',
    'Đại tiệc cầu vồng',
    'cake',
    ['pomeg-berry', 'kelpsy-berry', 'qualot-berry', 'hondew-berry'],
    { secret: true, rarity: 4 }
  ),
]
