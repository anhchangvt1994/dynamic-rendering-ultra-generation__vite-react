import styled from 'styled-components'
import { Pokeball } from 'components/common/FieldIcon'
import { badgeCount, fullCount } from './progress.mjs'

type Props = {
  bagCount: number
}

const BAG =
  'M9 6V5a3 3 0 0 1 6 0v1h2.5A2.5 2.5 0 0 1 20 8.5v10A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5v-10A2.5 2.5 0 0 1 6.5 6zm2 0h2V5a1 1 0 0 0-2 0zm-3 6v2h8v-2z'

/*
 * The bag and the collection as two sticker icons, the bag's count on a
 * badge (999+ at most, the full count for screen readers and on hover).
 */
const QuickStyle = styled.div`
  display: flex;
  flex: none;
  gap: 12px;
  padding: 0 4px 4px 0;

  .quick-btn {
    position: relative;
    display: grid;
    place-items: center;
    width: 54px;
    height: 54px;
    padding: 0;
    border: 3px solid var(--shadow-ink);
    border-radius: 16px;
    background: var(--sun);
    color: var(--ink);
    box-shadow: 4px 4px 0 var(--shadow-ink);
    cursor: pointer;
    transition:
      translate 120ms ease-out,
      box-shadow 120ms ease-out;
  }
  .quick-btn + .quick-btn {
    background: #fff;
  }
  .quick-btn:hover {
    translate: -2px -2px;
    box-shadow: 6px 6px 0 var(--shadow-ink);
  }
  .quick-btn:active {
    translate: 3px 3px;
    box-shadow: 1px 1px 0 var(--shadow-ink);
  }
  .quick-btn:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 3px;
  }
  .quick-btn svg {
    width: 28px;
    height: 28px;
  }
  .quick-bag path {
    fill: currentColor;
  }
  .quick-badge {
    position: absolute;
    right: -10px;
    top: -10px;
    min-width: 24px;
    height: 22px;
    padding: 0 6px;
    border: 2px solid var(--shadow-ink);
    border-radius: 999px;
    background: var(--lose);
    color: #fff;
    font-family: var(--font-display);
    font-size: 12px;
    line-height: 18px !important;
    text-align: center;
    white-space: nowrap;
  }
`

export default function QuickLinks({ bagCount }: Props) {
  const full = fullCount(bagCount)
  return (
    <QuickStyle className="quick">
      <LinkCustom
        className="quick-btn"
        to="/tui-do"
        aria-label={`Túi đồ, ${full} món`}
        title={`Túi đồ · ${full} món`}
      >
        <svg className="quick-bag" viewBox="0 0 24 24" aria-hidden="true">
          <path d={BAG} />
        </svg>
        {bagCount > 0 && (
          <b className="quick-badge" aria-hidden="true">
            {badgeCount(bagCount)}
          </b>
        )}
      </LinkCustom>
      <LinkCustom
        className="quick-btn"
        to="/?view=caught"
        aria-label="Bộ sưu tập"
        title="Bộ sưu tập"
      >
        <Pokeball />
      </LinkCustom>
    </QuickStyle>
  )
}
