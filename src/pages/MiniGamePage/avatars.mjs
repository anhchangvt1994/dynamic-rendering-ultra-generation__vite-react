// The twelve trainer avatars and what unlocks them. The database's
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
  { id: 'duelist', name: 'Đấu thủ', unlock: { type: 'badge', badge: 'first_win' } },
  { id: 'sage', name: 'Hiền giả', unlock: { type: 'badge', badge: 'flawless' } },
  { id: 'collector', name: 'Nhà sưu tầm', unlock: { type: 'badge', badge: 'owned_20' } },
  { id: 'captain', name: 'Đội trưởng', unlock: { type: 'badge', badge: 'full_team' } },
]

export const avatarUnlocked = (avatar, { level, badges }) => {
  const { unlock } = avatar
  if (unlock.type === 'free') return true
  if (unlock.type === 'level') return level >= unlock.level
  return badges.includes(unlock.badge)
}
