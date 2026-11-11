import { myPokemonPath } from '../paths.mjs'

type Blocked = { feed: string | null; bathe: string | null }
type Action = 'feed' | 'bathe' | 'pet' | 'play'

type Props = {
  individualId: string
  /** null while the care loads or failed: nothing to do yet */
  blocked: Blocked | null
  /** what its needs ask for now: that button calls out */
  urgent: Partial<Record<Action, boolean>>
  busy: boolean
  onFeed: () => void
  onPlay: () => void
  onBathe: () => void
  onPet: () => void
}

const LABEL = { feed: 'Cho ăn', bathe: 'Tắm' }

/** Feed, bathe, pet, cook: what can't be done now says why, under the bar. */
export default function CareBar({
  individualId,
  blocked,
  urgent,
  busy,
  onFeed,
  onPlay,
  onBathe,
  onPet,
}: Props) {
  const off = (reason: string | null | undefined) =>
    !blocked || busy || !!reason || undefined
  // const reasons = blocked
  //   ? (['feed', 'bathe'] as const)
  //       .filter((action) => blocked[action])
  //       .map((action) => `${LABEL[action]}: ${blocked[action]}`)
  //   : []
  const act = (
    action: Action,
    emoji: string,
    label: string,
    reason: string | null | undefined,
    run: () => void
  ) => (
    <button
      type="button"
      className="rm-act"
      data-action={action}
      data-urgent={(urgent[action] && !off(reason)) || undefined}
      aria-disabled={off(reason)}
      aria-describedby={action === 'pet' ? undefined : 'rm-reasons'}
      onClick={() => !off(reason) && run()}
    >
      <span aria-hidden="true">{emoji}</span>
      {label}
    </button>
  )
  return (
    <div className="rm-carebar">
      <div className="rm-actions">
        {act('feed', '🍲', 'Cho ăn', blocked?.feed, onFeed)}
        {act('bathe', '🫧', 'Tắm', blocked?.bathe, onBathe)}
        {act('pet', '🤚', 'Vuốt ve', null, onPet)}
        {act('play', '🎮', 'Chơi', null, onPlay)}
        <LinkCustom
          className="rm-act"
          data-action="cook"
          to="/che-bien"
          state={{ returnTo: myPokemonPath(individualId) }}
        >
          <span aria-hidden="true">👨‍🍳</span>
          Nấu
        </LinkCustom>
      </div>
      {/* <p className="rm-reasons" id="rm-reasons">
        {reasons.join(' · ')}
      </p> */}
    </div>
  )
}
