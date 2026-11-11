import { useState } from 'react'
import { useAccount } from 'app/supabase/account'
import MiniGameHost from './MiniGameHost'
import { GAMES } from './games/index.mjs'
import { MINIGAME } from './minigame.mjs'
import { MiniGamePageStyle } from './pageStyles'
import { useMiniGame } from './useMiniGame'

const wait = (iso: string | null | undefined, now: number) => {
  if (!iso) return ''
  const m = Math.max(1, Math.ceil((new Date(iso).getTime() - now) / 60_000))
  return m >= 60 ? `${Math.floor(m / 60)} giờ ${m % 60} phút` : `${m} phút`
}

/**
 * Mini game: the games a trainer plays with a Pokémon of their own. Private
 * to the player, so never indexed.
 */
export default function MiniGamePage() {
  setSeoTag({
    title: 'Mini game cùng Pokémon | Pokédex',
    description: 'Chơi mini game cùng Pokémon của bạn để nhận exp, quà và huy hiệu.',
    robots: 'noindex, nofollow',
  })
  const account = useAccount()
  const mg = useMiniGame()
  const [game, setGame] = useState<string | null>(null)
  const server = mg.mode === 'server'

  return (
    <MiniGamePageStyle>
      <p className="mgp-kicker">Mini game</p>
      <h1>Chơi cùng Pokémon</h1>
      <p className="mgp-sub">
        Mỗi ván {MINIGAME.DURATION_S / 60} phút. Thắng để nhận exp, quà và điểm huấn luyện viên.
      </p>
      {account.status !== 'off' && !server && mg.mode !== 'checking' && (
        <p className="mgp-note">
          Bạn chưa đăng nhập: chỉ chơi thử được, không mất lượt và không nhận thưởng.{' '}
          <LinkCustom to="/dang-nhap">Đăng nhập</LinkCustom> để tính điểm.
        </p>
      )}
      <ul className="mgp-list">
        {GAMES.map((g) => {
          const row = mg.status?.games?.[g.id]
          const left = row ? row.left : MINIGAME.TURNS
          return (
            <li key={g.id} className="mgp-card">
              <h2>{g.title}</h2>
              <p>{g.blurb}</p>
              <div className="mgp-turns" role="status">
                {server ? (
                  <>
                    {Array.from({ length: MINIGAME.TURNS }, (_, i) => (
                      <span key={i} className="mgp-dot" data-on={i < left || undefined} />
                    ))}
                    <span>
                      {left > 0
                        ? `Còn ${left}/${MINIGAME.TURNS} lượt`
                        : `Hết lượt, hồi sau ${wait(row?.resetAt, Date.now())}`}
                    </span>
                  </>
                ) : (
                  <span>Chơi thử</span>
                )}
              </div>
              <button type="button" className="mgp-play" onClick={() => setGame(g.id)}>
                Chơi
              </button>
            </li>
          )
        })}
      </ul>
      {game && (
        <MiniGameHost
          game={game}
          onClose={() => {
            setGame(null)
            mg.refresh()
          }}
        />
      )}
    </MiniGamePageStyle>
  )
}
