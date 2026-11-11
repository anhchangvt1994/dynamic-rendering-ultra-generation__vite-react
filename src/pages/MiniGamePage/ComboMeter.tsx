import { comboBonus, tierOf } from './combo.mjs'

/** The run of matches in a row, with the exp it adds. Hidden below ×2. */
export default function ComboMeter({ run, fade }: { run: number; fade?: boolean }) {
  if (run < 2) return null
  return (
    <div className="mg-combo" data-tier={tierOf(run)} data-fade={fade || undefined} role="status" aria-live="polite">
      <b>×{run}</b>
      <span>+{Math.round(comboBonus(run) * 100)}% exp</span>
    </div>
  )
}
