import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import type { Address } from 'viem'
import { CATEGORIES, LIMITS } from '../config/site'
import { prepare } from '../lib/contract'
import type { Listing, ListingKind, Member } from '../lib/contract'
import { byteLength, cleanLine, sameAddress, shortAddress } from '../lib/format'
import { activeMembers } from '../lib/guyubData'
import type { GuyubData } from '../lib/guyubData'
import { headroomUnits, hoursLong } from '../lib/hours'
import { displayName, useProfile } from '../lib/store'
import { useTx } from '../lib/tx'
import { BalancePreview } from './BalancePreview'
import { ByteCount, Field, PublicNote, TxNote } from './bits'
import { HoursPicker } from './HoursPicker'
import { Modal } from './Modal'

const NOTE_WARNING = 'Notes are public and permanent. Leave out addresses, health details and anything private.'

function MemberOption({ member }: { member: Member }) {
  const profile = useProfile(member.wallet)
  return (
    <option value={member.wallet}>
      {profile?.name ? `${profile.name} (${shortAddress(member.wallet)})` : shortAddress(member.wallet)}
    </option>
  )
}

function Actions({ busy, label, onCancel, disabled }: { busy: boolean; label: string; onCancel: () => void; disabled?: boolean }) {
  return (
    <div className="dialog__actions">
      <button type="button" className="btn btn--quiet" onClick={onCancel} disabled={busy}>
        Cancel
      </button>
      <button type="submit" className="btn btn--primary" disabled={busy || disabled}>
        {label}
      </button>
    </div>
  )
}

// ───────────────────────────── Give or request hours ─────────────────────────────

export type ExchangeMode = 'give' | 'request'

export function ExchangeDialog({
  open,
  onClose,
  mode,
  data,
  me,
  initialOther,
  initialListing,
}: {
  open: boolean
  onClose: () => void
  mode: ExchangeMode
  data: GuyubData
  me: Address
  initialOther?: Address
  initialListing?: bigint
}) {
  const { state, run, busy, reset } = useTx()
  const close = () => {
    if (busy) return
    reset()
    onClose()
  }
  const title = mode === 'give' ? 'Give hours' : 'Request hours'
  return (
    <Modal open={open} onClose={close} title={title} busy={busy}>
      {open && (
        <ExchangeForm
          key={`${mode}:${initialOther ?? ''}:${initialListing ?? ''}`}
          mode={mode}
          data={data}
          me={me}
          initialOther={initialOther}
          initialListing={initialListing}
          state={state}
          run={run}
          busy={busy}
          onCancel={close}
          onDone={onClose}
          reset={reset}
        />
      )}
    </Modal>
  )
}

type TxApi = ReturnType<typeof useTx>

function ExchangeForm({
  mode,
  data,
  me,
  initialOther,
  initialListing,
  state,
  run,
  busy,
  onCancel,
  onDone,
  reset,
}: {
  mode: ExchangeMode
  data: GuyubData
  me: Address
  initialOther?: Address
  initialListing?: bigint
  onCancel: () => void
  onDone: () => void
} & Pick<TxApi, 'state' | 'run' | 'busy' | 'reset'>) {
  const ids = useId()
  const { guyub, listings } = data
  const others = activeMembers(data).filter((m) => !sameAddress(m.wallet, me))
  const [other, setOther] = useState<string>(
    initialOther && others.some((m) => sameAddress(m.wallet, initialOther)) ? initialOther : (others[0]?.wallet ?? ''),
  )
  const [units, setUnits] = useState(4)
  const [memo, setMemo] = useState('')
  const [listingId, setListingId] = useState<string>(initialListing ? String(initialListing) : '0')
  const [touched, setTouched] = useState(false)

  const mine = data.members.find((m) => sameAddress(m.wallet, me))
  const theirs = others.find((m) => sameAddress(m.wallet, other))
  const otherProfile = useProfile(theirs?.wallet)
  const otherName = theirs ? displayName(theirs.wallet, otherProfile) : 'them'

  const payer = mode === 'give' ? mine : theirs
  const payerRoom = payer ? headroomUnits(payer.balance, guyub.creditHours) : 0
  const memoClean = cleanLine(memo)
  const memoError = byteLength(memoClean) > LIMITS.memo ? `Keep the note to ${LIMITS.memo} bytes.` : undefined
  const overLimit = units > payerRoom
  const blocked = mode === 'give' && overLimit

  const linkable: Listing[] = listings.filter((l) => l.open || String(l.id) === listingId)

  if (others.length === 0) {
    return (
      <div className="dialog__content">
        <p>There is nobody else in this guyub yet. Share the invite link so a neighbour can join.</p>
        <div className="dialog__actions">
          <button type="button" className="btn btn--secondary" onClick={onCancel}>
            Close
          </button>
        </div>
      </div>
    )
  }

  if (state.phase === 'done') {
    return (
      <div className="dialog__content">
        <TxNote
          state={state}
          done={
            mode === 'give'
              ? `You paid ${otherName} ${hoursLong(units)}.`
              : `Request sent. ${otherName} will see it in their inbox and can approve it.`
          }
        />
        <div className="dialog__actions">
          <button type="button" className="btn btn--primary" onClick={() => { reset(); onDone() }}>
            Close
          </button>
        </div>
      </div>
    )
  }

  const submit = async () => {
    setTouched(true)
    if (!theirs || memoError || blocked) return
    const listing = BigInt(listingId || '0')
    await run<unknown>((account) =>
      mode === 'give'
        ? prepare.giveHours(account, guyub.id, theirs.wallet, units, memoClean, listing)
        : prepare.requestHours(account, guyub.id, theirs.wallet, units, memoClean, listing),
    )
  }

  return (
    <form
      className="dialog__content form"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
      noValidate
    >
      <p className="dialog__lead">
        {mode === 'give'
          ? 'Someone helped you. Pay them in hours; it happens in one step.'
          : 'You helped someone. Ask them to pay; nothing moves until they approve.'}
      </p>

      <Field id={`${ids}-who`} label={mode === 'give' ? 'Who helped you?' : 'Who did you help?'}>
        <select id={`${ids}-who`} value={other} onChange={(e) => setOther(e.target.value)} disabled={busy}>
          {others.map((m) => (
            <MemberOption key={m.wallet} member={m} />
          ))}
        </select>
      </Field>

      <HoursPicker id={`${ids}-hours`} units={units} onChange={setUnits} max={mode === 'give' ? payerRoom : undefined} />

      <Field
        id={`${ids}-memo`}
        label="Note"
        hint={NOTE_WARNING}
        error={touched ? memoError : undefined}
        counter={<ByteCount text={memoClean} max={LIMITS.memo} />}
      >
        <input
          id={`${ids}-memo`}
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder={mode === 'give' ? 'e.g. Fixed my bike chain' : 'e.g. Two hours of maths homework'}
          aria-describedby={`${ids}-memo-hint`}
          disabled={busy}
        />
      </Field>

      {linkable.length > 0 && (
        <Field id={`${ids}-listing`} label="For a listing (optional)">
          <select id={`${ids}-listing`} value={listingId} onChange={(e) => setListingId(e.target.value)} disabled={busy}>
            <option value="0">Not linked to a listing</option>
            {linkable.map((l) => (
              <option key={String(l.id)} value={String(l.id)}>
                {l.kind === 'offer' ? 'Offer' : 'Request'}: {l.title}
              </option>
            ))}
          </select>
        </Field>
      )}

      {theirs && mine && (
        <BalancePreview
          creditHours={guyub.creditHours}
          sides={
            mode === 'give'
              ? [
                  { who: me, before: mine.balance, delta: -units },
                  { who: theirs.wallet, before: theirs.balance, delta: units },
                ]
              : [
                  { who: theirs.wallet, before: theirs.balance, delta: -units },
                  { who: me, before: mine.balance, delta: units },
                ]
          }
        />
      )}

      {blocked && (
        <p className="note note--warn" role="alert">
          {payerRoom > 0
            ? `That goes past this guyub's credit limit of ${guyub.creditHours} h. You can pay up to ${hoursLong(payerRoom)} right now.`
            : `Your balance is at the credit limit of ${guyub.creditHours} h. Help someone to earn hours back first.`}
        </p>
      )}
      {mode === 'request' && overLimit && (
        <p className="note note--warn">
          {otherName} can only pay {hoursLong(payerRoom)} right now. They can approve once they have earned more hours,
          or you can ask for less.
        </p>
      )}

      <TxNote state={state} />
      <Actions busy={busy} onCancel={onCancel} label={mode === 'give' ? `Give ${hoursLong(units)}` : `Request ${hoursLong(units)}`} disabled={blocked} />
    </form>
  )
}

// ───────────────────────────── Post a listing ─────────────────────────────

export function ListingDialog({
  open,
  onClose,
  guyubId,
  initialKind = 'offer',
}: {
  open: boolean
  onClose: () => void
  guyubId: bigint
  initialKind?: ListingKind
}) {
  const tx = useTx()
  const close = () => {
    if (tx.busy) return
    tx.reset()
    onClose()
  }
  return (
    <Modal open={open} onClose={close} title="Post on the board" busy={tx.busy}>
      {open && <ListingForm key={initialKind} guyubId={guyubId} initialKind={initialKind} tx={tx} onCancel={close} />}
    </Modal>
  )
}

function ListingForm({ guyubId, initialKind, tx, onCancel }: { guyubId: bigint; initialKind: ListingKind; tx: TxApi; onCancel: () => void }) {
  const ids = useId()
  const [kind, setKind] = useState<ListingKind>(initialKind)
  const [category, setCategory] = useState(0)
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const [touched, setTouched] = useState(false)

  const titleClean = cleanLine(title)
  const detailClean = detail.trim()
  const titleBytes = byteLength(titleClean)
  const titleError =
    titleBytes < LIMITS.titleMin
      ? 'Give it a short title, at least 3 characters.'
      : titleBytes > LIMITS.titleMax
        ? `Keep the title to ${LIMITS.titleMax} bytes.`
        : undefined
  const detailError = byteLength(detailClean) > LIMITS.detail ? `Keep the details to ${LIMITS.detail} bytes.` : undefined

  if (tx.state.phase === 'done') {
    return (
      <div className="dialog__content">
        <TxNote state={tx.state} done="Posted. It is on the board now." />
        <div className="dialog__actions">
          <button type="button" className="btn btn--primary" onClick={onCancel}>
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <form
      className="dialog__content form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        setTouched(true)
        if (titleError || detailError) return
        void tx.run((account) => prepare.postListing(account, guyubId, kind, category, titleClean, detailClean))
      }}
    >
      <fieldset className="segmented">
        <legend className="field__label">What kind</legend>
        <label className={`segmented__option ${kind === 'offer' ? 'is-on' : ''}`}>
          <input type="radio" name={`${ids}-kind`} checked={kind === 'offer'} onChange={() => setKind('offer')} />
          <span>
            <strong>Offer</strong> · I can help with…
          </span>
        </label>
        <label className={`segmented__option ${kind === 'request' ? 'is-on' : ''}`}>
          <input type="radio" name={`${ids}-kind`} checked={kind === 'request'} onChange={() => setKind('request')} />
          <span>
            <strong>Request</strong> · I need help with…
          </span>
        </label>
      </fieldset>

      <Field id={`${ids}-cat`} label="Category">
        <select id={`${ids}-cat`} value={category} onChange={(e) => setCategory(Number(e.target.value))}>
          {CATEGORIES.map((c, i) => (
            <option key={c} value={i}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <Field
        id={`${ids}-title`}
        label="Title"
        error={touched ? titleError : undefined}
        counter={<ByteCount text={titleClean} max={LIMITS.titleMax} />}
      >
        <input
          id={`${ids}-title`}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={kind === 'offer' ? 'e.g. Excel basics for beginners' : 'e.g. Someone to water my plants'}
          aria-invalid={touched && !!titleError}
          aria-describedby={touched && titleError ? `${ids}-title-error` : undefined}
        />
      </Field>

      <Field
        id={`${ids}-detail`}
        label="Details (optional)"
        error={touched ? detailError : undefined}
        counter={<ByteCount text={detailClean} max={LIMITS.detail} />}
      >
        <textarea
          id={`${ids}-detail`}
          rows={3}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="When, where, anything people should know."
        />
      </Field>

      <PublicNote>Everything on the board is public and stays on BOT Chain for good.</PublicNote>
      <TxNote state={tx.state} />
      <Actions busy={tx.busy} onCancel={onCancel} label={kind === 'offer' ? 'Post offer' : 'Post request'} />
    </form>
  )
}

// ───────────────────────────── Commons: donate and grant ─────────────────────────────

export function DonateDialog({ open, onClose, data, me }: { open: boolean; onClose: () => void; data: GuyubData; me: Address }) {
  const tx = useTx()
  const close = () => {
    if (tx.busy) return
    tx.reset()
    onClose()
  }
  return (
    <Modal open={open} onClose={close} title="Give to the commons" busy={tx.busy}>
      {open && <DonateForm data={data} me={me} tx={tx} onCancel={close} />}
    </Modal>
  )
}

function DonateForm({ data, me, tx, onCancel }: { data: GuyubData; me: Address; tx: TxApi; onCancel: () => void }) {
  const ids = useId()
  const [units, setUnits] = useState(2)
  const mine = data.members.find((m) => sameAddress(m.wallet, me))
  const room = mine ? headroomUnits(mine.balance, data.guyub.creditHours) : 0
  const blocked = units > room

  if (tx.state.phase === 'done') {
    return (
      <Done tx={tx} onClose={onCancel}>
        Thank you. {hoursLong(units)} went to the commons.
      </Done>
    )
  }
  return (
    <form
      className="dialog__content form"
      onSubmit={(event) => {
        event.preventDefault()
        if (blocked) return
        void tx.run((account) => prepare.donate(account, data.guyub.id, units))
      }}
    >
      <p className="dialog__lead">
        The commons belongs to the whole guyub. The steward can grant from it to members who receive more help than
        they can give back.
      </p>
      <HoursPicker id={`${ids}-hours`} units={units} onChange={setUnits} max={room} />
      {mine && (
        <BalancePreview
          creditHours={data.guyub.creditHours}
          sides={[
            { who: me, before: mine.balance, delta: -units },
            { who: 'commons', before: data.guyub.commons, delta: units },
          ]}
        />
      )}
      {blocked && (
        <p className="note note--warn" role="alert">
          {room > 0 ? `You can give up to ${hoursLong(room)} without passing the credit limit.` : 'Your balance is at the credit limit.'}
        </p>
      )}
      <TxNote state={tx.state} />
      <Actions busy={tx.busy} onCancel={onCancel} label={`Give ${hoursLong(units)}`} disabled={blocked} />
    </form>
  )
}

export function GrantDialog({ open, onClose, data, me }: { open: boolean; onClose: () => void; data: GuyubData; me: Address }) {
  const tx = useTx()
  const close = () => {
    if (tx.busy) return
    tx.reset()
    onClose()
  }
  return (
    <Modal open={open} onClose={close} title="Grant from the commons" busy={tx.busy}>
      {open && <GrantForm data={data} me={me} tx={tx} onCancel={close} />}
    </Modal>
  )
}

function GrantForm({ data, me, tx, onCancel }: { data: GuyubData; me: Address; tx: TxApi; onCancel: () => void }) {
  const ids = useId()
  const others = activeMembers(data).filter((m) => !sameAddress(m.wallet, me))
  const [to, setTo] = useState<string>(others[0]?.wallet ?? '')
  const [units, setUnits] = useState(Math.min(4, Math.max(1, data.guyub.commons)))
  const [memo, setMemo] = useState('')
  const memoClean = cleanLine(memo)
  const pot = data.guyub.commons
  const target = others.find((m) => sameAddress(m.wallet, to))
  const blocked = units > pot || !target || byteLength(memoClean) > LIMITS.memo

  if (tx.state.phase === 'done') {
    return (
      <Done tx={tx} onClose={onCancel}>
        Granted {hoursLong(units)} from the commons.
      </Done>
    )
  }
  if (pot <= 0) {
    return (
      <div className="dialog__content">
        <p>The commons holds {pot < 0 ? 'less than nothing' : 'nothing'} right now, so there is nothing to grant.</p>
        <div className="dialog__actions">
          <button type="button" className="btn btn--secondary" onClick={onCancel}>
            Close
          </button>
        </div>
      </div>
    )
  }
  if (others.length === 0) {
    return (
      <div className="dialog__content">
        <p>There is nobody to grant to yet. A steward cannot grant to themselves.</p>
        <div className="dialog__actions">
          <button type="button" className="btn btn--secondary" onClick={onCancel}>
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <form
      className="dialog__content form"
      onSubmit={(event) => {
        event.preventDefault()
        if (blocked || !target) return
        void tx.run((account) => prepare.grant(account, data.guyub.id, target.wallet, units, memoClean))
      }}
    >
      <p className="dialog__lead">
        Grants come only out of the commons, never out of anyone's balance, and you cannot grant to yourself. Every
        grant shows in the ledger.
      </p>
      <Field id={`${ids}-to`} label="Grant to">
        <select id={`${ids}-to`} value={to} onChange={(e) => setTo(e.target.value)}>
          {others.map((m) => (
            <MemberOption key={m.wallet} member={m} />
          ))}
        </select>
      </Field>
      <HoursPicker id={`${ids}-hours`} units={units} onChange={setUnits} max={pot} />
      <Field id={`${ids}-memo`} label="Note" hint={NOTE_WARNING} counter={<ByteCount text={memoClean} max={LIMITS.memo} />}>
        <input id={`${ids}-memo`} type="text" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="e.g. For Mbah Sri's errands" />
      </Field>
      {target && (
        <BalancePreview
          creditHours={data.guyub.creditHours}
          sides={[
            { who: 'commons', before: pot, delta: -units },
            { who: target.wallet, before: target.balance, delta: units },
          ]}
        />
      )}
      {units > pot && (
        <p className="note note--warn" role="alert">
          The commons only holds {hoursLong(pot)}.
        </p>
      )}
      <TxNote state={tx.state} />
      <Actions busy={tx.busy} onCancel={onCancel} label={`Grant ${hoursLong(units)}`} disabled={blocked} />
    </form>
  )
}

// ───────────────────────────── Confirm a one-step action ─────────────────────────────

/** Any of the `prepare` dry runs. */
type Prepared = { request: unknown; result: unknown }

export function ConfirmDialog({
  open,
  onClose,
  title,
  children,
  confirmLabel,
  destructive = false,
  action,
  doneText,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  confirmLabel: string
  destructive?: boolean
  action: (account: Address) => Promise<Prepared>
  doneText: string
}) {
  const tx = useTx()
  const close = () => {
    if (tx.busy) return
    tx.reset()
    onClose()
  }
  return (
    <Modal open={open} onClose={close} title={title} busy={tx.busy}>
      {open &&
        (tx.state.phase === 'done' ? (
          <Done tx={tx} onClose={close}>
            {doneText}
          </Done>
        ) : (
          <form
            className="dialog__content form"
            onSubmit={(event) => {
              event.preventDefault()
              void tx.run<unknown>(action)
            }}
          >
            <div className="dialog__lead">{children}</div>
            <TxNote state={tx.state} />
            <div className="dialog__actions">
              <button type="button" className="btn btn--quiet" onClick={close} disabled={tx.busy}>
                Cancel
              </button>
              <button type="submit" className={`btn ${destructive ? 'btn--danger' : 'btn--primary'}`} disabled={tx.busy}>
                {confirmLabel}
              </button>
            </div>
          </form>
        ))}
    </Modal>
  )
}

function Done({ tx, onClose, children }: { tx: TxApi; onClose: () => void; children: ReactNode }) {
  return (
    <div className="dialog__content">
      <TxNote state={tx.state} done={typeof children === 'string' ? children : undefined} />
      {typeof children !== 'string' && <p className="tx tx--done-text">{children}</p>}
      <div className="dialog__actions">
        <button type="button" className="btn btn--primary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
