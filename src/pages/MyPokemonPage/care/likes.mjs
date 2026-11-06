// Each personality (traits.mjs PERSONALITIES, by index) likes one flavour and
// dislikes another, named by the stat it feeds (kitchen.mjs FLAVOR_STAT). The
// database's pokemon_care_taste holds the same table: sqlParity.test.mjs.

export const LIKES = [
  { like: 'happiness', dislike: 'power' }, // Hiền
  { like: 'power', dislike: 'wisdom' }, // Nghịch
  { like: 'wisdom', dislike: 'agility' }, // Điềm tĩnh
  { like: 'agility', dislike: 'beauty' }, // Tò mò
  { like: 'power', dislike: 'happiness' }, // Dũng cảm
  { like: 'happiness', dislike: 'agility' }, // Nhút nhát
  { like: 'happiness', dislike: 'wisdom' }, // Lười
  { like: 'wisdom', dislike: 'happiness' }, // Siêng
  { like: 'beauty', dislike: 'power' }, // Kiêu hãnh
  { like: 'agility', dislike: 'wisdom' }, // Tinh nghịch
  { like: 'beauty', dislike: 'agility' }, // Mơ mộng
  { like: 'wisdom', dislike: 'power' }, // Cẩn thận
]

/** A dish tastes of its strongest stat (dishView's `top`). */
export const dishFlavor = (dish) => dish?.top?.[0] ?? null

/** 'liked', 'disliked' or 'neutral' for this personality. */
export function tasteOf(personality, dish) {
  const flavor = dishFlavor(dish)
  const taste = LIKES[personality]
  if (!flavor || !taste) return 'neutral'
  if (flavor === taste.like) return 'liked'
  if (flavor === taste.dislike) return 'disliked'
  return 'neutral'
}
