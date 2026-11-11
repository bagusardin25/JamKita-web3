import { Check, X } from 'lucide-react'
import { BalancePreview } from '../components/BalancePreview'
import { useInbox } from '../lib/inbox'
import { Empty, ErrorState, Loading, Person, TxNote } from '../components/bits'
import { CONTRACT_ADDRESS } from '../config/chains'
import { fetchMemberships, prepare } from '../lib/contract'
import type { HourRequest, JoinRequest, Membership } from '../lib/contract'
import { timeAgo } from '../lib/format'
import { headroomUnits, hoursLong } from '../lib/hours'
import { href } from '../lib/router'
import { useTx } from '../lib/tx'
import { useAsync } from '../lib/useAsync'
import { useWallet } from '../lib/wallet'

export function Inbox() {
  const wallet = useWallet()
  const account = wallet.active?.account
  const inbox = useInbox()
  const memberships = useAsync(account && CONTRACT_ADDRESS ? `memberships:${account}` : null, () => fetchMemberships(account!))

  if (!account) {
    return (
      <div className="wrap page page--narrow">
        <h1 className="page__title">Inbox</h1>
        <div className="state state--empty">
          <p>Connect a wallet to see hour requests waiting for you and, if you are a steward, people asking to join.</p>
          <button type="button" className="btn btn--primary" onClick={wallet.openDialog}>
            Connect wallet
          </button>
        </div>
      </div>
    )
  }

  const byId = new Map((memberships.data ?? []).map((m) => [String(m.guyub.id), m]))
  const data = inbox.data

  return (
    <div className="wrap page page--narrow">
      <h1 className="page__title">Inbox</h1>
      <p className="page__lead">Everything waiting on you, across all your guyubs.</p>

      {inbox.error && !data ? (
        <ErrorState error={inbox.error} onRetry={inbox.reload} />
      ) : !data ? (
        <Loading label="Checking what is waiting for you…" />
      ) : data.toApprove.length + data.joins.length + data.sent.length === 0 ? (
        <Empty title="Nothing is waiting for you">
          <p>When a neighbour asks you to pay for their help, it shows up here.</p>
          <a className="btn btn--secondary btn--small" href={href.home}>
            Browse guyubs
          </a>
        </Empty>
      ) : (
        <div className="inbox">
          <section aria-labelledby="ask-title" className="inbox__section">
            <h2 id="ask-title" className="section__title section__title--small">
              Asked of you <span className="num count">{data.toApprove.length}</span>
            </h2>
            {data.toApprove.length === 0 ? (
              <p className="t-sub">No hour requests are waiting for you.</p>
            ) : (
              <ul className="inbox__list">
                {data.toApprove.map((r) => (
                  <ApproveCard key={String(r.id)} request={r} membership={byId.get(String(r.guyubId))} />
                ))}
              </ul>
            )}
          </section>

          {data.joins.length > 0 && (
            <section aria-labelledby="join-title" className="inbox__section">
              <h2 id="join-title" className="section__title section__title--small">
                Asking to join <span className="num count">{data.joins.length}</span>
              </h2>
              <ul className="inbox__list">
                {data.joins.map((j) => (
                  <JoinCard key={`${j.guyubId}:${j.wallet}`} join={j} membership={byId.get(String(j.guyubId))} />
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="sent-title" className="inbox__section">
            <h2 id="sent-title" className="section__title section__title--small">
              Sent by you, waiting <span className="num count">{data.sent.length}</span>
            </h2>
            {data.sent.length === 0 ? (
              <p className="t-sub">You have no open requests.</p>
            ) : (
              <ul className="inbox__list">
                {data.sent.map((r) => (
                  <SentCard key={String(r.id)} request={r} membership={byId.get(String(r.guyubId))} />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

function GuyubLink({ id, membership }: { id: bigint; membership?: Membership }) {
  return <a href={href.guyub(id)}>{membership?.guyub.name ?? `Guyub #${id}`}</a>
}

function ApproveCard({ request, membership }: { request: HourRequest; membership?: Membership }) {
  const tx = useTx()
  const credit = membership?.guyub.creditHours ?? 0
  const balance = membership?.member.balance ?? 0
  const room = headroomUnits(balance, credit)
  const tooMuch = membership ? request.units > room : false
  return (
    <li className="inbox-card inbox-card--ask">
      <p className="inbox-card__what">
        <Person address={request.helper} plain /> asks you for <strong className="num">{hoursLong(request.units)}</strong>
      </p>
      <p className="inbox-card__meta">
        In <GuyubLink id={request.guyubId} membership={membership} /> · {timeAgo(request.createdAt)}
      </p>
      {request.memo && <blockquote className="inbox-card__memo">{request.memo}</blockquote>}
      {membership && (
        <BalancePreview
          creditHours={credit}
          sides={[
            { who: request.payer, before: balance, delta: -request.units },
          ]}
        />
      )}
      {tooMuch && (
        <p className="note note--warn">
          Approving would pass the credit limit; you can pay up to {hoursLong(room)} right now. Decline it, or ask{' '}
          them to send a smaller request.
        </p>
      )}
      {tx.state.phase !== 'done' && (
        <div className="inbox-card__actions">
          <button
            type="button"
            className="btn btn--primary btn--small"
            disabled={tx.busy || tooMuch}
            onClick={() => void tx.run((account) => prepare.approveRequest(account, request.id))}
          >
            <Check size={16} aria-hidden="true" />
            Approve and pay
          </button>
          <button
            type="button"
            className="btn btn--quiet btn--small"
            disabled={tx.busy}
            onClick={() => void tx.run((account) => prepare.declineRequest(account, request.id))}
          >
            <X size={16} aria-hidden="true" />
            Decline
          </button>
        </div>
      )}
      <TxNote state={tx.state} />
    </li>
  )
}

function JoinCard({ join, membership }: { join: JoinRequest; membership?: Membership }) {
  const tx = useTx()
  return (
    <li className="inbox-card">
      <p className="inbox-card__what">
        <Person address={join.wallet} /> wants to join
      </p>
      <p className="inbox-card__meta">
        <GuyubLink id={join.guyubId} membership={membership} /> · asked {timeAgo(join.since)}
      </p>
      {tx.state.phase !== 'done' && (
        <div className="inbox-card__actions">
          <button
            type="button"
            className="btn btn--primary btn--small"
            disabled={tx.busy}
            onClick={() => void tx.run((account) => prepare.approveMember(account, join.guyubId, join.wallet))}
          >
            Approve
          </button>
          <button
            type="button"
            className="btn btn--quiet btn--small"
            disabled={tx.busy}
            onClick={() => void tx.run((account) => prepare.declineMember(account, join.guyubId, join.wallet))}
          >
            Decline
          </button>
        </div>
      )}
      <TxNote state={tx.state} />
    </li>
  )
}

function SentCard({ request, membership }: { request: HourRequest; membership?: Membership }) {
  const tx = useTx()
  return (
    <li className="inbox-card inbox-card--sent">
      <p className="inbox-card__what">
        You asked <Person address={request.payer} plain /> for <strong className="num">{hoursLong(request.units)}</strong>
      </p>
      <p className="inbox-card__meta">
        In <GuyubLink id={request.guyubId} membership={membership} /> · {timeAgo(request.createdAt)} · waiting for them
      </p>
      {request.memo && <blockquote className="inbox-card__memo">{request.memo}</blockquote>}
      {tx.state.phase !== 'done' && (
        <div className="inbox-card__actions">
          <button
            type="button"
            className="btn btn--quiet btn--small"
            disabled={tx.busy}
            onClick={() => void tx.run((account) => prepare.cancelRequest(account, request.id))}
          >
            Cancel request
          </button>
        </div>
      )}
      <TxNote state={tx.state} />
    </li>
  )
}
