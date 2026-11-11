import { CircleCheck, TriangleAlert } from 'lucide-react'
import { Empty, Person } from '../../components/bits'
import type { Entry } from '../../lib/contract'
import { ENTRY_LABEL } from '../../lib/labels'
import { formatDateTime, plural, timeAgo } from '../../lib/format'
import { zeroSum } from '../../lib/guyubData'
import type { GuyubData } from '../../lib/guyubData'
import { MINUS, hoursLong, hoursShort } from '../../lib/hours'


/** The check every ledger page shows: member balances plus the commons, which must be zero. */
export function ZeroSumCheck({ data }: { data: GuyubData }) {
  const { plus, minus, commons, total } = zeroSum(data)
  const ok = total === 0
  return (
    <div className={`zero-check ${ok ? 'zero-check--ok' : 'zero-check--bad'}`} role="status" aria-live="polite">
      <div className="zero-check__icon" aria-hidden="true">
        {ok ? <CircleCheck size={28} /> : <TriangleAlert size={28} />}
      </div>
      <div className="zero-check__body">
        <p className="zero-check__title">
          {ok ? 'Balanced: member balances + commons = 0' : 'Out of balance — please report this'}
        </p>
        <p className="zero-check__sum num" aria-label={`Plus balances ${hoursLong(plus)}, minus balances ${hoursLong(minus)}, commons ${hoursLong(commons)}, total ${hoursLong(total)}`}>
          <span className="zero-check__term">
            <span className="signed signed--plus">+{hoursShort(plus)}</span>
          </span>
          <span className="zero-check__term">
            <span className="zero-check__op">{MINUS}</span>
            <span className="signed signed--minus">{hoursShort(minus)}</span>
          </span>
          <span className="zero-check__term">
            <span className="zero-check__op">{commons < 0 ? MINUS : '+'}</span>
            <span className="zero-check__commons">{hoursShort(commons)} commons</span>
          </span>
          <span className="zero-check__term">
            <span className="zero-check__op">=</span>
            <strong>{total === 0 ? '0 h' : hoursShort(total)}</strong>
          </span>
        </p>
        <p className="zero-check__fine">
          Added up in your browser from every member's balance as read from the contract, not taken on trust.
        </p>
      </div>
    </div>
  )
}

export function LedgerTable({ entries, caption }: { entries: Entry[]; caption: string }) {
  return (
    <div className="table-card">
      <table className="table table--cards table--ledger">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">When</th>
            <th scope="col">What</th>
            <th scope="col">From</th>
            <th scope="col">To</th>
            <th scope="col" className="t-num">
              Hours
            </th>
            <th scope="col">Note</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.index}>
              <td data-label="When">
                <time dateTime={new Date(e.time * 1000).toISOString()} title={formatDateTime(e.time)}>
                  {timeAgo(e.time)}
                </time>
              </td>
              <th scope="row" data-label="What" className="t-main">
                <span className={`kind kind--${e.kind}`}>{ENTRY_LABEL[e.kind]}</span>
              </th>
              <td data-label="From">
                <Person address={e.from} plain />
              </td>
              <td data-label="To">
                <Person address={e.to} plain />
              </td>
              <td className="t-num" data-label="Hours">
                <span className="num">{hoursShort(e.units)}</span>
              </td>
              <td data-label="Note" className="t-note">
                {e.memo || <span className="t-sub">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function LedgerTab({ data }: { data: GuyubData }) {
  const open = data.requests.filter((r) => r.status === 'pending')
  return (
    <section aria-labelledby="ledger-title">
      <div className="panel-head">
        <div>
          <h2 id="ledger-title" className="panel-head__title">
            Ledger
          </h2>
          <p className="panel-head__lead">
            Every movement of hours in this guyub, newest first. Nothing can be edited or taken back.
          </p>
        </div>
      </div>

      <ZeroSumCheck data={data} />

      {open.length > 0 && (
        <div className="open-requests">
          <h3 className="open-requests__title">Waiting for approval ({open.length})</h3>
          <ul>
            {open.map((r) => (
              <li key={String(r.id)}>
                <Person address={r.helper} plain /> asked <Person address={r.payer} plain /> for{' '}
                <strong className="num">{hoursLong(r.units)}</strong>
                {r.memo && <span className="t-sub"> · “{r.memo}”</span>}
                <span className="t-sub"> · {timeAgo(r.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.entries.length === 0 ? (
        <Empty title="No hours have moved yet">
          <p>The first exchange will show up here.</p>
        </Empty>
      ) : (
        <>
          <LedgerTable entries={data.entries} caption="All movements of hours, newest first" />
          <p className="t-sub ledger-foot">
            {data.moreEntries
              ? `Showing the latest ${plural(data.entries.length, 'entry', 'entries')} of ${data.guyub.ledgerSize}.`
              : `${plural(data.entries.length, 'entry', 'entries')} in total.`}{' '}
            Hours move from the From column to the To column; each member's balance, with its sign, is on the
            Members tab.
          </p>
        </>
      )}
    </section>
  )
}
