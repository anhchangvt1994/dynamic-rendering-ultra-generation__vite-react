import { useState } from 'react'
import { useAccount } from 'app/supabase/account'
import MiniGameHost from './MiniGameHost'
import { GAMES } from './games/index.mjs'
import { MINIGAME } from './minigame.mjs'
import Booth from './hub/Booth'
import Marquee from './hub/Marquee'
import HubShell, { HubBooths } from './hub/HubShell'
import StampCard from './hub/StampCard'
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
    description: 'Chơi mini game cùng Pokémon của bạn để nhận exp và quà.',
    robots: 'noindex, nofollow',
  })
  const account = useAccount()
  const mg = useMiniGame()
  const [game, setGame] = useState<string | null>(null)
  const server = mg.mode === 'server'
  const guest = !server && account.status !== 'off' && mg.mode !== 'checking'
  const now = Date.now()

  return (
    <HubShell>
      <Marquee
        text="Chơi cùng Pokémon"
        lead={`Mỗi ván ${MINIGAME.DURATION_S / 60} phút. Thắng để nhận exp, quà và điểm huấn luyện viên.`}
      />
      <HubBooths>
        {GAMES.map((g, i) => {
          const row = mg.status?.games?.[g.id]
          return (
            <Booth
              key={g.id}
              game={g}
              index={i}
              server={server}
              left={row ? row.left : null}
              resetText={wait(row?.resetAt, now)}
              open={game === g.id}
              onPlay={() => setGame(g.id)}
            />
          )
        })}
      </HubBooths>
      <StampCard mg={mg} guest={guest} />
      {game && (
        <MiniGameHost
          game={game}
          onClose={() => {
            setGame(null)
            mg.refresh()
          }}
        />
      )}
    </HubShell>
  )
}
