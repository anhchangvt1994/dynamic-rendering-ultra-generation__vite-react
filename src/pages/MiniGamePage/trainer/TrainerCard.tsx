import { useCallback, useEffect, useState } from 'react'
import { getSupabase } from 'app/supabase/client'
import { useIndividualList } from 'pages/BagPage/individuals/individualStore'
import { fetchBuild } from 'pages/MyPokemonPage/build/client.mjs'
import GameSheet from '../GameSheet'
import { MINIGAME, slotsFor, xpFor } from '../minigame.mjs'
import type { useMiniGame } from '../useMiniGame'
import AvatarArt from './AvatarArt'
import AvatarPicker from './AvatarPicker'
import TeamPicker from './TeamPicker'

type Sheet = 'avatar' | 'team' | null

/** The trainer at the top of the page: avatar, level, xp and team. */
export default function TrainerCard({ mg }: { mg: ReturnType<typeof useMiniGame> }) {
  const trainer = mg.status?.trainer
  const [sheet, setSheet] = useState<Sheet>(null)
  const [cares, setCares] = useState<Record<string, { affection: number }>>({})
  const { items } = useIndividualList(mg.mode === 'server', null)
  const { cares: readCares } = mg

  useEffect(() => {
    if (sheet === 'team') readCares().then(setCares, () => {})
  }, [sheet, readCares])
  const loadBuild = useCallback(
    async (id: string) =>
      fetchBuild({ mode: 'server', supabase: await getSupabase() }, id) as Promise<{ level: number }>,
    []
  )

  if (!trainer) return null
  const from = xpFor(trainer.level)
  const to = trainer.level >= MINIGAME.LEVEL_MAX ? from : xpFor(trainer.level + 1)
  const pct = to > from ? Math.round(((trainer.xp - from) / (to - from)) * 100) : 100
  const close = () => setSheet(null)

  return (
    <section className="tr-card" aria-label="Hồ sơ huấn luyện viên">
      <button type="button" className="tr-face" onClick={() => setSheet('avatar')} aria-label="Đổi avatar">
        <AvatarArt id={trainer.avatar} size={84} />
      </button>
      <div className="tr-info">
        <b>Trainer level {trainer.level}</b>
        <span className="tr-xp" role="img" aria-label={`${pct}% đến level tiếp theo`}>
          <i style={{ width: `${pct}%` }} />
        </span>
        <span className="tr-line">
          {trainer.level >= MINIGAME.LEVEL_MAX ? 'Level tối đa' : `${trainer.xp}/${to} điểm`} · {trainer.owned} Pokémon
        </span>
      </div>
      <div className="tr-actions">
        <button type="button" onClick={() => setSheet('team')}>
          Đội hình {trainer.team.length}/{slotsFor(trainer.level)}
        </button>
      </div>
      <GameSheet open={sheet === 'avatar'} onClose={close} title="Chọn avatar">
        <AvatarPicker
          trainer={trainer}
          wins={Object.values(mg.status?.games ?? {}).reduce((n, g) => n + g.wins, 0)}
          onPick={mg.setAvatar}
          onDone={close}
        />
      </GameSheet>
      <GameSheet open={sheet === 'team'} onClose={close} title="Đội hình">
        {sheet === 'team' && (
          <TeamPicker
            individuals={items ?? []}
            trainer={trainer}
            cares={cares}
            loadBuild={loadBuild}
            onSave={mg.setTeam}
            onDone={close}
          />
        )}
      </GameSheet>
    </section>
  )
}
