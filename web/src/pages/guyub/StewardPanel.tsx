import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Person, TxNote } from '../../components/bits'
import { prepare } from '../../lib/contract'
import type { Member } from '../../lib/contract'
import { sameAddress, shortAddress, timeAgo } from '../../lib/format'
import { activeMembers } from '../../lib/guyubData'
import type { GuyubData } from '../../lib/guyubData'
import { useProfile } from '../../lib/store'
import { useTx } from '../../lib/tx'
import type { GuyubAction } from './GuyubPage'

export function StewardPanel({ data, onAction }: { data: GuyubData; onAction: (a: GuyubAction) => void }) {
  const others = activeMembers(data).filter((m) => !sameAddress(m.wallet, data.guyub.steward))
  const [handTo, setHandTo] = useState('')
  const target = others.find((m) => sameAddress(m.wallet, handTo)) ?? others[0]

  return (
    <details className="steward" open={data.pending.length > 0 || undefined}>
      <summary className="steward__summary">
        <ShieldCheck size={20} aria-hidden="true" />
        <span>Steward panel</span>
        {data.pending.length > 0 && <span className="nav__badge num">{data.pending.length}</span>}
      </summary>
      <div className="steward__body">
        <div className="steward__col">
          <h3 className="steward__title">Asking to join</h3>
          {data.pending.length === 0 ? (
            <p className="t-sub">Nobody is waiting.</p>
          ) : (
            <ul className="queue">
              {data.pending.map((m) => (
                <PendingRow key={m.wallet} guyubId={data.guyub.id} member={m} />
              ))}
            </ul>
          )}
        </div>

        <div className="steward__col">
          <h3 className="steward__title">Hand over</h3>
          {others.length === 0 ? (
            <p className="t-sub">Once someone else joins you can hand the steward role to them.</p>
          ) : (
            <div className="inline-form">
              <label className="select-inline">
                <span>New steward</span>
                <select value={target?.wallet ?? ''} onChange={(e) => setHandTo(e.target.value)}>
                  {others.map((m) => (
                    <StewardOption key={m.wallet} member={m} />
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="btn btn--secondary btn--small"
                onClick={() => target && onAction({ type: 'transfer', member: target })}
              >
                Hand over…
              </button>
            </div>
          )}
          <p className="steward__limits">
            A steward approves and removes members, grants from the commons and hands over. A steward cannot change
            anyone's balance, create hours, undo an exchange or grant to themselves.
          </p>
        </div>
      </div>
    </details>
  )
}

function StewardOption({ member }: { member: Member }) {
  const profile = useProfile(member.wallet)
  return <option value={member.wallet}>{profile?.name || shortAddress(member.wallet)}</option>
}

function PendingRow({ guyubId, member }: { guyubId: bigint; member: Member }) {
  const tx = useTx()
  return (
    <li className="queue__item">
      <span className="queue__who">
        <Person address={member.wallet} />
        <span className="t-sub">asked {timeAgo(member.since)}</span>
      </span>
      <span className="queue__actions">
        <button
          type="button"
          className="btn btn--primary btn--small"
          disabled={tx.busy}
          onClick={() => void tx.run((account) => prepare.approveMember(account, guyubId, member.wallet))}
        >
          Approve
        </button>
        <button
          type="button"
          className="btn btn--quiet btn--small"
          disabled={tx.busy}
          onClick={() => void tx.run((account) => prepare.declineMember(account, guyubId, member.wallet))}
        >
          Decline
        </button>
      </span>
      <TxNote state={tx.state} />
    </li>
  )
}
