import { useState } from 'react'
import MiniGameHost from './MiniGameHost'
import { GAMES } from './games/index.mjs'
import { MINIGAME } from './minigame.mjs'
import HubShell, { HubBooths } from './hub/HubShell'
import { useMiniGame } from './useMiniGame'

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
  const mg = useMiniGame()
  const [game, setGame] = useState<string | null>(null)

  return (
    <HubShell>
      <section data-region="title" style={{ ['--n' as string]: 0 }}>
        <h1>Chơi cùng Pokémon</h1>
        <p className="hub-sub">
          Mỗi ván {MINIGAME.DURATION_S / 60} phút. Thắng để nhận exp, quà và điểm huấn luyện viên.
        </p>
      </section>
      <section data-region="trainer" style={{ ['--n' as string]: 1 }} />
      <HubBooths>
        {GAMES.map((g, i) => (
          <article key={g.id} data-region="booth" style={{ ['--n' as string]: 2 + i }}>
            <h2>{g.title}</h2>
            <button type="button" className="mgp-play hub-booth-btn" onClick={() => setGame(g.id)}>
              Chơi
            </button>
          </article>
        ))}
      </HubBooths>
      <section data-region="quests" style={{ ['--n' as string]: 4 }} />
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
