import { useState } from 'react'
import { ClockRing } from '../../components/ClockRing'
import { Person, Signed } from '../../components/bits'
import type { Member } from '../../lib/contract'
import { formatDate, sameAddress } from '../../lib/format'
import type { GuyubData } from '../../lib/guyubData'
import { balanceWords, hoursShort } from '../../lib/hours'
import { useProfile } from '../../lib/store'
import { useWallet } from '../../lib/wallet'
import type { GuyubAction } from './GuyubPage'

type Sort = 'joined' | 'balance' | 'exchanges'

export function MembersTab({
  data,
  isSteward,
  canAct,
  onAction,
}: {
  data: GuyubData
  isSteward: boolean
  canAct: boolean
  onAction: (a: GuyubAction) => void
}) {
  const [sort, setSort] = useState<Sort>('joined')
  const active = data.members.filter((m) => m.status === 'active')
  const former = data.members.filter((m) => m.status === 'left' || m.status === 'removed')
  const sorted = [...active].sort((a, b) =>
    sort === 'balance' ? b.balance - a.balance : sort === 'exchanges' ? b.exchanges - a.exchanges : 0,
  )

  return (
    <section aria-labelledby="members-title">
      <div className="panel-head">
        <div>
          <h2 id="members-title" className="panel-head__title">
            Members
          </h2>
          <p className="panel-head__lead">
            Every balance is open to the whole guyub. A plus means someone gave more help than they received.
          </p>
        </div>
        <label className="select-inline">
          <span>Sort by</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="joined">Order joined</option>
            <option value="balance">Balance, highest first</option>
            <option value="exchanges">Most exchanges</option>
          </select>
        </label>
      </div>

      <div className="table-card">
        <table className="table table--cards table--members">
          <caption className="visually-hidden">Active members and their balances</caption>
          <thead>
            <tr>
              <th scope="col">Member</th>
              <th scope="col" className="t-num">
                Balance
              </th>
              <th scope="col" className="t-num">
                Gave help
              </th>
              <th scope="col" className="t-num">
                Got help
              </th>
              <th scope="col" className="t-num">
                Exchanges
              </th>
              <th scope="col">Since</th>
              <th scope="col">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m) => (
              <MemberRow key={m.wallet} member={m} data={data} isSteward={isSteward} canAct={canAct} onAction={onAction} />
            ))}
          </tbody>
        </table>
      </div>

      {former.length > 0 && (
        <details className="former">
          <summary>
            Former members (<span className="num">{former.length}</span>)
          </summary>
          <ul className="former__list">
            {former.map((m) => (
              <li key={m.wallet}>
                <Person address={m.wallet} />
                <span className="tag tag--plain">{m.status === 'removed' ? 'Removed by the steward' : 'Left'}</span>
                <span className="num t-sub">
                  {hoursShort(m.earned)} given · {hoursShort(m.paid)} received
                </span>
              </li>
            ))}
          </ul>
          <p className="t-sub">Their balances went to the commons when they left. The ledger shows each move.</p>
        </details>
      )}
    </section>
  )
}

function MemberRow({
  member,
  data,
  isSteward,
  canAct,
  onAction,
}: {
  member: Member
  data: GuyubData
  isSteward: boolean
  canAct: boolean
  onAction: (a: GuyubAction) => void
}) {
  const { active } = useWallet()
  const profile = useProfile(member.wallet)
  const me = sameAddress(active?.account, member.wallet)
  const steward = sameAddress(data.guyub.steward, member.wallet)
  return (
    <tr className={me ? 'is-me' : undefined}>
      <th scope="row" className="t-main">
        <span className="member-cell">
          <ClockRing units={member.balance} creditHours={data.guyub.creditHours} size="sm" />
          <span>
            <Person address={member.wallet} />
            {steward && <span className="tag tag--plain tag--tiny">Steward</span>}
            {profile?.about && <span className="t-sub">{profile.about}</span>}
            {profile?.contact && <span className="t-sub t-sub--contact">Contact: {profile.contact}</span>}
          </span>
        </span>
      </th>
      <td className="t-num" data-label="Balance">
        <Signed units={member.balance} />
        <span className="t-sub t-sub--fine">{balanceWords(member.balance)}</span>
      </td>
      <td className="t-num" data-label="Gave help">
        {hoursShort(member.earned)}
      </td>
      <td className="t-num" data-label="Got help">
        {hoursShort(member.paid)}
      </td>
      <td className="t-num" data-label="Exchanges">
        {member.exchanges}
      </td>
      <td data-label="Since">{formatDate(member.since)}</td>
      <td className="t-action">
        {canAct && !me && (
          <span className="row-actions">
            <button
              type="button"
              className="btn btn--quiet btn--small"
              onClick={() => onAction({ type: 'exchange', mode: 'give', other: member.wallet })}
            >
              Give hours
            </button>
            {isSteward && !steward && (
              <button type="button" className="btn btn--quiet btn--small btn--danger-text" onClick={() => onAction({ type: 'remove', member })}>
                Remove
              </button>
            )}
          </span>
        )}
      </td>
    </tr>
  )
}
