import { useState } from 'react'
import { ArrowLeft, HandCoins, HandHelping, Megaphone, UserPlus } from 'lucide-react'
import type { Address } from 'viem'
import { ClockRing } from '../../components/ClockRing'
import { CopyButton, ErrorState, Loading, TxNote } from '../../components/bits'
import { ConfirmDialog, DonateDialog, ExchangeDialog, GrantDialog, ListingDialog } from '../../components/forms'
import type { ExchangeMode } from '../../components/forms'
import { GuyubMissingError, prepare } from '../../lib/contract'
import type { Listing, ListingKind, Member } from '../../lib/contract'
import { plural, sameAddress } from '../../lib/format'
import { fetchGuyubData, memberIn } from '../../lib/guyubData'
import type { GuyubData } from '../../lib/guyubData'
import { headroomUnits, hoursLong, hoursShort, youWords } from '../../lib/hours'
import { absoluteUrl, href } from '../../lib/router'
import type { GuyubTab } from '../../lib/router'
import { displayName, useProfile } from '../../lib/store'
import { useTx } from '../../lib/tx'
import { useAsync } from '../../lib/useAsync'
import { useWallet } from '../../lib/wallet'
import { BoardTab } from './BoardTab'
import { CommonsTab } from './CommonsTab'
import { LedgerTab } from './LedgerTab'
import { MembersTab } from './MembersTab'
import { StewardPanel } from './StewardPanel'

export type GuyubAction =
  | { type: 'exchange'; mode: ExchangeMode; other?: Address; listing?: bigint }
  | { type: 'post'; kind: ListingKind }
  | { type: 'donate' }
  | { type: 'grant' }
  | { type: 'leave' }
  | { type: 'remove'; member: Member }
  | { type: 'transfer'; member: Member }
  | { type: 'close'; listing: Listing }

const TABS: { tab: GuyubTab; label: string }[] = [
  { tab: 'board', label: 'Board' },
  { tab: 'members', label: 'Members' },
  { tab: 'ledger', label: 'Ledger' },
  { tab: 'commons', label: 'Commons' },
]

export function GuyubPage({ id, tab }: { id: bigint; tab: GuyubTab }) {
  const data = useAsync(`guyub:${id}`, () => fetchGuyubData(id))

  if (data.error && !data.data) {
    if (data.error instanceof GuyubMissingError) {
      return (
        <div className="wrap page page--narrow">
          <div className="state state--empty">
            <h1 className="page__title">No guyub here</h1>
            <p>There is no guyub number {String(id)}. It may not have been opened yet.</p>
            <a className="btn btn--primary" href={href.home}>
              See all guyubs
            </a>
          </div>
        </div>
      )
    }
    return (
      <div className="wrap page">
        <ErrorState error={data.error} onRetry={data.reload} />
      </div>
    )
  }
  if (!data.data) {
    return (
      <div className="wrap page">
        <Loading label="Reading this guyub's ledger…" />
      </div>
    )
  }
  return <GuyubView data={data.data} tab={tab} />
}

function GuyubView({ data, tab }: { data: GuyubData; tab: GuyubTab }) {
  const { guyub } = data
  const { active } = useWallet()
  const me = active?.account
  const mine = memberIn(data, me)
  const isMember = mine?.status === 'active'
  const isSteward = !!me && sameAddress(guyub.steward, me)
  const [action, setAction] = useState<GuyubAction | null>(null)
  const close = () => setAction(null)
  const stewardProfile = useProfile(guyub.steward)

  return (
    <div className="page page--guyub">
      <div className="wrap">
        <a className="back-link" href={href.home}>
          <ArrowLeft size={16} aria-hidden="true" />
          All guyubs
        </a>

        <section className="guyub-head" aria-labelledby="guyub-title">
          <div className="guyub-head__main">
            <p className="eyebrow">Guyub #{String(guyub.id)}</p>
            <h1 id="guyub-title" className="page__title">
              {guyub.name}
            </h1>
            {guyub.about && <p className="guyub-head__about">{guyub.about}</p>}
            <dl className="facts facts--row">
              <div>
                <dt>Steward</dt>
                <dd>{displayName(guyub.steward, stewardProfile)}</dd>
              </div>
              <div>
                <dt>Members</dt>
                <dd className="num">{guyub.activeMembers}</dd>
              </div>
              <div>
                <dt>Credit limit</dt>
                <dd className="num">{guyub.creditHours} h below zero</dd>
              </div>
              <div>
                <dt>Joining</dt>
                <dd>{guyub.joinMode === 'open' ? 'Open to anyone' : 'Steward approves'}</dd>
              </div>
              <div>
                <dt>Exchanged</dt>
                <dd className="num">
                  {hoursShort(guyub.unitsExchanged)} in {plural(guyub.exchanges, 'exchange')}
                </dd>
              </div>
            </dl>
            <div className="guyub-head__share">
              <CopyButton text={absoluteUrl(href.guyub(guyub.id))} label="Copy invite link" />
            </div>
          </div>

          <MyPanel data={data} mine={mine} onAction={setAction} />
        </section>

        {isSteward && <StewardPanel data={data} onAction={setAction} />}

        <nav className="tabs" aria-label="Guyub sections">
          {TABS.map((t) => (
            <a
              key={t.tab}
              href={href.guyub(guyub.id, t.tab)}
              className={`tabs__tab ${t.tab === tab ? 'is-on' : ''}`}
              aria-current={t.tab === tab ? 'page' : undefined}
            >
              {t.label}
              {t.tab === 'board' && <span className="tabs__count num">{data.listings.filter((l) => l.open).length}</span>}
              {t.tab === 'members' && <span className="tabs__count num">{guyub.activeMembers}</span>}
            </a>
          ))}
        </nav>

        <div className="tab-panel">
          {tab === 'board' && <BoardTab data={data} canAct={isMember} onAction={setAction} />}
          {tab === 'members' && <MembersTab data={data} isSteward={isSteward} canAct={isMember} onAction={setAction} />}
          {tab === 'ledger' && <LedgerTab data={data} />}
          {tab === 'commons' && <CommonsTab data={data} isMember={isMember} isSteward={isSteward} onAction={setAction} />}
        </div>
      </div>

      {me && isMember && (
        <>
          <ExchangeDialog
            open={action?.type === 'exchange'}
            onClose={close}
            mode={action?.type === 'exchange' ? action.mode : 'give'}
            data={data}
            me={me}
            initialOther={action?.type === 'exchange' ? action.other : undefined}
            initialListing={action?.type === 'exchange' ? action.listing : undefined}
          />
          <ListingDialog
            open={action?.type === 'post'}
            onClose={close}
            guyubId={guyub.id}
            initialKind={action?.type === 'post' ? action.kind : 'offer'}
          />
          <DonateDialog open={action?.type === 'donate'} onClose={close} data={data} me={me} />
        </>
      )}
      {me && isSteward && <GrantDialog open={action?.type === 'grant'} onClose={close} data={data} me={me} />}
      <ActionConfirms data={data} action={action} onClose={close} />
    </div>
  )
}

/** The connected wallet's place in this guyub: its balance ring and what it can do. */
function MyPanel({ data, mine, onAction }: { data: GuyubData; mine: Member | undefined; onAction: (a: GuyubAction) => void }) {
  const { guyub } = data
  const wallet = useWallet()
  const tx = useTx()
  const status = mine?.status ?? 'none'

  if (status === 'active' && mine) {
    const room = headroomUnits(mine.balance, guyub.creditHours)
    return (
      <aside className="my-panel" aria-label="Your balance in this guyub">
        <div className="my-panel__ring">
          <ClockRing units={mine.balance} creditHours={guyub.creditHours} size="lg" caption="your balance" />
        </div>
        <p className="my-panel__words">
          {youWords(mine.balance)}{' '}
          <span className="my-panel__room">
            {room > 0
              ? `You can pay up to ${hoursLong(room)} right now.`
              : 'You are at the credit limit: earn hours back before you pay again.'}
          </span>
        </p>
        <div className="my-panel__actions">
          <button type="button" className="btn btn--primary" onClick={() => onAction({ type: 'exchange', mode: 'give' })}>
            <HandCoins size={18} aria-hidden="true" />
            Give hours
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => onAction({ type: 'exchange', mode: 'request' })}>
            <HandHelping size={18} aria-hidden="true" />
            Request hours
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => onAction({ type: 'post', kind: 'offer' })}>
            <Megaphone size={18} aria-hidden="true" />
            Post on the board
          </button>
        </div>
        {!sameAddress(guyub.steward, mine.wallet) && (
          <button type="button" className="link-btn my-panel__leave" onClick={() => onAction({ type: 'leave' })}>
            Leave this guyub
          </button>
        )}
      </aside>
    )
  }

  if (status === 'pending') {
    return (
      <aside className="my-panel my-panel--quiet" aria-label="Your request to join">
        <h2 className="my-panel__title">Waiting for the steward</h2>
        <p>Your request to join is in the steward's inbox. You will be a member as soon as they approve it.</p>
        <button
          type="button"
          className="btn btn--quiet btn--small"
          disabled={tx.busy}
          onClick={() => void tx.run((account) => prepare.leave(account, guyub.id))}
        >
          Withdraw my request
        </button>
        <TxNote state={tx.state} done="Request withdrawn." />
      </aside>
    )
  }

  const asks = guyub.joinMode === 'approval' || status === 'removed'
  const again = status === 'left' || status === 'removed'
  return (
    <aside className="my-panel my-panel--quiet" aria-label="Join this guyub">
      <h2 className="my-panel__title">{again ? 'Not a member any more' : 'Want to take part?'}</h2>
      <p>
        {asks
          ? 'The steward approves each new member. Ask to join and they will see it in their inbox.'
          : 'This guyub is open. Join and you start at zero hours, like everyone else.'}
        {!wallet.active && ' You will need a wallet.'}
      </p>
      <button
        type="button"
        className="btn btn--primary"
        disabled={tx.busy}
        onClick={() => void tx.run((account) => prepare.join(account, guyub.id))}
      >
        <UserPlus size={18} aria-hidden="true" />
        {asks ? (again ? 'Ask to join again' : 'Ask to join') : again ? 'Join again' : 'Join this guyub'}
      </button>
      <TxNote state={tx.state} done={asks ? 'Request sent to the steward.' : 'Welcome! You are a member now.'} />
    </aside>
  )
}

function ActionConfirms({ data, action, onClose }: { data: GuyubData; action: GuyubAction | null; onClose: () => void }) {
  const { guyub } = data
  const { active } = useWallet()
  const mine = memberIn(data, active?.account)
  const target = action?.type === 'remove' || action?.type === 'transfer' ? action.member : undefined
  const targetProfile = useProfile(target?.wallet)
  const targetName = target ? displayName(target.wallet, targetProfile) : ''

  return (
    <>
      <ConfirmDialog
        open={action?.type === 'leave'}
        onClose={onClose}
        title="Leave this guyub?"
        confirmLabel="Leave guyub"
        destructive
        doneText="You have left the guyub."
        action={(account) => prepare.leave(account, guyub.id)}
      >
        {mine && mine.balance < 0 ? (
          <p>
            Your balance is {hoursLong(mine.balance)} below zero. You can leave once it is back to zero or above, so
            help a neighbour first.
          </p>
        ) : mine && mine.balance > 0 ? (
          <p>
            Your {hoursLong(mine.balance)} will go to the commons, where the steward can grant them to members who need
            them. You can join again later, starting from zero.
          </p>
        ) : (
          <p>Your balance is zero, so nothing moves. You can join again later.</p>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={action?.type === 'remove'}
        onClose={onClose}
        title={`Remove ${targetName}?`}
        confirmLabel="Remove member"
        destructive
        doneText={`${targetName} is no longer a member.`}
        action={(account) => prepare.removeMember(account, guyub.id, target!.wallet)}
      >
        <p>
          {target && target.balance < 0
            ? `Their balance of ${hoursLong(target.balance)} below zero will be covered by the commons. `
            : target && target.balance > 0
              ? `Their ${hoursLong(target.balance)} will go to the commons. `
              : 'Their balance is zero, so no hours move. '}
          The removal shows in the ledger for everyone, and they will have to ask before joining again.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={action?.type === 'transfer'}
        onClose={onClose}
        title={`Make ${targetName} the steward?`}
        confirmLabel="Hand over"
        doneText={`${targetName} is the steward now.`}
        action={(account) => prepare.transferSteward(account, guyub.id, target!.wallet)}
      >
        <p>
          They will approve members, remove members and grant from the commons. You stay a member with your balance
          unchanged, and you lose those powers straight away.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={action?.type === 'close'}
        onClose={onClose}
        title="Close this listing?"
        confirmLabel="Close listing"
        doneText="Closed. It no longer shows on the board."
        action={(account) => prepare.closeListing(account, (action as { listing: Listing }).listing.id)}
      >
        <p>
          “{action?.type === 'close' ? action.listing.title : ''}” will leave the board. Exchanges already linked to it
          stay in the ledger.
        </p>
      </ConfirmDialog>
    </>
  )
}

