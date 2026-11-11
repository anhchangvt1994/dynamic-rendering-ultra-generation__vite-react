// The twelve trainer avatars and what unlocks them (level, mini-game wins,
// Pokémon owned, team size; badges are kept for gym battles). The database's
// trainer_set_avatar() checks the same table (trainer_avatars()).
export const AVATARS = [
  { id: 'rookie', name: 'Tân binh', unlock: { type: 'free' } },
  { id: 'scout', name: 'Trinh sát', unlock: { type: 'free' } },
  { id: 'camper', name: 'Dân cắm trại', unlock: { type: 'free' } },
  { id: 'hiker', name: 'Người leo núi', unlock: { type: 'level', level: 5 } },
  { id: 'ranger', name: 'Kiểm lâm', unlock: { type: 'level', level: 10 } },
  { id: 'breeder', name: 'Người nhân giống', unlock: { type: 'level', level: 15 } },
  { id: 'ace', name: 'Át chủ bài', unlock: { type: 'level', level: 20 } },
  { id: 'champion', name: 'Nhà vô địch', unlock: { type: 'level', level: 30 } },
  { id: 'duelist', name: 'Đấu thủ', unlock: { type: 'wins', wins: 1 } },
  { id: 'sage', name: 'Hiền giả', unlock: { type: 'wins', wins: 10 } },
  { id: 'collector', name: 'Nhà sưu tầm', unlock: { type: 'owned', owned: 20 } },
  { id: 'captain', name: 'Đội trưởng', unlock: { type: 'team', size: 6 } },
]

// level: trainer level, wins: mini-game wins (all games), owned: Pokémon owned, team: team size
export const avatarUnlocked = (avatar, { level, wins = 0, owned = 0, team = 0 }) => {
  const { unlock } = avatar
  switch (unlock.type) {
    case 'free':
      return true
    case 'level':
      return level >= unlock.level
    case 'wins':
      return wins >= unlock.wins
    case 'owned':
      return owned >= unlock.owned
    case 'team':
      return team >= unlock.size
    default:
      return false
  }
}
