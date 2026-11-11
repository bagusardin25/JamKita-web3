import { Gift, HeartHandshake } from 'lucide-react'
import { ClockRing } from '../../components/ClockRing'
import { Empty } from '../../components/bits'
import { isCommons } from '../../lib/contract'
import type { GuyubData } from '../../lib/guyubData'
import { hoursLong } from '../../lib/hours'
import type { GuyubAction } from './GuyubPage'
import { LedgerTable } from './LedgerTab'

export function CommonsTab({
  data,
  isMember,
  isSteward,
  onAction,
}: {
  data: GuyubData
  isMember: boolean
  isSteward: boolean
  onAction: (a: GuyubAction) => void
}) {
  const { commons } = data.guyub
  const moves = data.entries.filter((e) => isCommons(e.from) || isCommons(e.to))
  return (
    <section aria-labelledby="commons-title">
      <div className="panel-head">
        <div>
          <h2 id="commons-title" className="panel-head__title">
            Commons
          </h2>
          <p className="panel-head__lead">The guyub's shared pot of hours. It belongs to nobody in particular.</p>
        </div>
      </div>

      <div className="commons">
        <div className="commons__ring">
          <ClockRing units={commons} size="lg" caption="in the commons" />
        </div>
        <div className="commons__text">
          <ul className="rules">
            <li>Any member can give hours to the commons, within their own credit limit.</li>
            <li>
              Only the steward can grant from it, to another member, and never more than it holds
              {commons > 0 ? ` (${hoursLong(commons)} now)` : ''}.
            </li>
            <li>When someone leaves with hours to spare, those hours come here.</li>
            <li>
              When the steward removes someone below zero, the commons covers the gap in the open, and can go below zero
              itself.
            </li>
          </ul>
          <div className="commons__actions">
            {isMember && (
              <button type="button" className="btn btn--secondary" onClick={() => onAction({ type: 'donate' })}>
                <HeartHandshake size={18} aria-hidden="true" />
                Give to the commons
              </button>
            )}
            {isSteward && (
              <button type="button" className="btn btn--primary" onClick={() => onAction({ type: 'grant' })} disabled={commons <= 0}>
                <Gift size={18} aria-hidden="true" />
                Grant from the commons
              </button>
            )}
          </div>
          {isSteward && commons <= 0 && <p className="t-sub">Granting opens once the commons holds some hours.</p>}
        </div>
      </div>

      <h3 className="subhead">Commons history</h3>
      {moves.length === 0 ? (
        <Empty title="Nothing has gone in or out yet" />
      ) : (
        <LedgerTable entries={moves} caption="Movements in and out of the commons, newest first" />
      )}
    </section>
  )
}
