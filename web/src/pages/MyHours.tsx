import { useId, useState } from 'react'
import type { Address } from 'viem'
import { ClockRing } from '../components/ClockRing'
import { ByteCount, Empty, ErrorState, Field, Loading, Person, PublicNote, Signed, TxNote } from '../components/bits'
import { CONTRACT_ADDRESS } from '../config/chains'
import { LIMITS } from '../config/site'
import { fetchLedger, fetchMemberships, fetchProfile, isCommons, prepare } from '../lib/contract'
import type { Entry, Membership, Profile } from '../lib/contract'
import { byteLength, cleanLine, formatDateTime, sameAddress, timeAgo } from '../lib/format'
import { hoursShort, youWords } from '../lib/hours'
import { href } from '../lib/router'
import { rememberProfile } from '../lib/store'
import { useTx } from '../lib/tx'
import { useAsync } from '../lib/useAsync'
import { useWallet } from '../lib/wallet'
import { ENTRY_LABEL } from '../lib/labels'

const STATUS_TEXT = { none: 'Not a member', pending: 'Waiting for approval', active: 'Member', left: 'Left', removed: 'Removed' } as const

export function MyHours() {
  const wallet = useWallet()
  const account = wallet.active?.account
  if (!account) {
    return (
      <div className="wrap page page--narrow">
        <h1 className="page__title">My hours</h1>
        <div className="state state--empty">
          <p>Connect a wallet to see your balance in each guyub and set up the profile your neighbours see.</p>
          <button type="button" className="btn btn--primary" onClick={wallet.openDialog}>
            Connect wallet
          </button>
        </div>
      </div>
    )
  }
  return <MyHoursFor account={account} />
}

function MyHoursFor({ account }: { account: Address }) {
  const memberships = useAsync(CONTRACT_ADDRESS ? `memberships:${account}` : null, () => fetchMemberships(account))
  const profile = useAsync(CONTRACT_ADDRESS ? `profile:${account}` : null, () => fetchProfile(account))

  return (
    <div className="wrap page">
      <h1 className="page__title">My hours</h1>
      <p className="page__lead">
        Your balance in each guyub. Hours stay in the guyub where they were earned; they do not move between guyubs.
      </p>

      <div className="me-grid">
        <section aria-labelledby="balances-title" className="me-grid__main">
          <h2 id="balances-title" className="section__title section__title--small">
            Balances
          </h2>
          {memberships.error && !memberships.data ? (
            <ErrorState error={memberships.error} onRetry={memberships.reload} />
          ) : !memberships.data ? (
            <Loading />
          ) : memberships.data.length === 0 ? (
            <Empty title="You are not in a guyub yet">
              <p>Join one from the directory, or start your own.</p>
              <a className="btn btn--primary btn--small" href={href.home}>
                Find a guyub
              </a>
            </Empty>
          ) : (
            <ul className="balance-cards">
              {memberships.data.map((m) => (
                <BalanceCard key={String(m.guyub.id)} membership={m} />
              ))}
            </ul>
          )}

          {memberships.data && memberships.data.length > 0 && <History account={account} memberships={memberships.data} />}
        </section>

        <aside className="me-grid__side" aria-labelledby="profile-title">
          <h2 id="profile-title" className="section__title section__title--small">
            Profile
          </h2>
          {profile.error && !profile.data ? (
            <ErrorState error={profile.error} onRetry={profile.reload} />
          ) : !profile.data ? (
            <Loading label="Reading your profile…" />
          ) : (
            <ProfileForm key={profile.data.updatedAt} account={account} profile={profile.data} />
          )}
        </aside>
      </div>
    </div>
  )
}

function BalanceCard({ membership }: { membership: Membership }) {
  const { guyub, member } = membership
  const active = member.status === 'active'
  return (
    <li className={`balance-card ${active ? '' : 'balance-card--inactive'}`}>
      <ClockRing units={member.balance} creditHours={active ? guyub.creditHours : undefined} size="md" />
      <div className="balance-card__text">
        <a className="balance-card__name" href={href.guyub(guyub.id)}>
          {guyub.name}
        </a>
        <span className="tag tag--plain tag--tiny">{STATUS_TEXT[member.status]}</span>
        {active && (
          <>
            <p className="balance-card__words">{youWords(member.balance)}</p>
            <p className="t-sub num">
              Gave {hoursShort(member.earned)} · got {hoursShort(member.paid)} · limit {guyub.creditHours} h
            </p>
          </>
        )}
      </div>
    </li>
  )
}

type MyEntry = Entry & { guyubId: bigint; guyubName: string }

function History({ account, memberships }: { account: Address; memberships: Membership[] }) {
  const key = `history:${account}:${memberships.map((m) => `${m.guyub.id}.${m.guyub.ledgerSize}`).join(',')}`
  const history = useAsync(key, async () => {
    const touched = memberships.filter((m) => m.member.status !== 'none' && m.guyub.ledgerSize > 0)
    const pages = await Promise.all(touched.map((m) => fetchLedger(m.guyub.id)))
    const mine: MyEntry[] = []
    pages.forEach((page, i) => {
      for (const e of page.entries) {
        if (sameAddress(e.from, account) || sameAddress(e.to, account)) {
          mine.push({ ...e, guyubId: touched[i].guyub.id, guyubName: touched[i].guyub.name })
        }
      }
    })
    return mine.sort((a, b) => b.time - a.time || b.index - a.index).slice(0, 60)
  })

  return (
    <section aria-labelledby="history-title" className="history">
      <h2 id="history-title" className="section__title section__title--small">
        My history
      </h2>
      {history.error && !history.data ? (
        <ErrorState error={history.error} onRetry={history.reload} />
      ) : !history.data ? (
        <Loading label="Reading your history…" />
      ) : history.data.length === 0 ? (
        <p className="t-sub">No hours have moved to or from you yet.</p>
      ) : (
        <ul className="history__list">
          {history.data.map((e) => {
            const out = sameAddress(e.from, account)
            const other = out ? e.to : e.from
            return (
              <li key={`${e.guyubId}:${e.index}`} className="history__item">
                <Signed units={out ? -e.units : e.units} className="history__amount" />
                <span className="history__text">
                  <span>
                    {ENTRY_LABEL[e.kind]} · {out ? 'to' : 'from'} {isCommons(other) ? 'the commons' : <Person address={other} plain />}
                  </span>
                  {e.memo && <span className="t-sub">“{e.memo}”</span>}
                  <span className="t-sub">
                    <a href={href.guyub(e.guyubId, 'ledger')}>{e.guyubName}</a> ·{' '}
                    <time dateTime={new Date(e.time * 1000).toISOString()} title={formatDateTime(e.time)}>
                      {timeAgo(e.time)}
                    </time>
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function ProfileForm({ account, profile }: { account: Address; profile: Profile }) {
  const ids = useId()
  const tx = useTx()
  const [name, setName] = useState(profile.name)
  const [about, setAbout] = useState(profile.about)
  const [contact, setContact] = useState(profile.contact)

  const clean = { name: cleanLine(name), about: cleanLine(about), contact: cleanLine(contact) }
  const tooLong =
    byteLength(clean.name) > LIMITS.profileName || byteLength(clean.about) > LIMITS.profileAbout || byteLength(clean.contact) > LIMITS.contact
  const unchanged = clean.name === profile.name && clean.about === profile.about && clean.contact === profile.contact

  return (
    <form
      className="card form"
      noValidate
      onSubmit={async (event) => {
        event.preventDefault()
        if (tooLong) return
        const done = await tx.run((a) => prepare.setProfile(a, clean.name, clean.about, clean.contact))
        if (done) rememberProfile(account, { ...clean, updatedAt: Math.floor(Date.now() / 1000) })
      }}
    >
      <PublicNote>
        Your profile is public and permanent, shown in every guyub. Only add a contact you are happy for anyone to see.
      </PublicNote>
      <Field id={`${ids}-name`} label="Name" counter={<ByteCount text={clean.name} max={LIMITS.profileName} />}>
        <input id={`${ids}-name`} type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="nickname" />
      </Field>
      <Field id={`${ids}-about`} label="About you" counter={<ByteCount text={clean.about} max={LIMITS.profileAbout} />}>
        <textarea id={`${ids}-about`} rows={3} value={about} onChange={(e) => setAbout(e.target.value)} placeholder="What you are good at, when you are free." />
      </Field>
      <Field
        id={`${ids}-contact`}
        label="Contact (optional)"
        hint="For example a Telegram handle, so neighbours can reach you outside the app."
        counter={<ByteCount text={clean.contact} max={LIMITS.contact} />}
      >
        <input id={`${ids}-contact`} type="text" value={contact} onChange={(e) => setContact(e.target.value)} aria-describedby={`${ids}-contact-hint`} />
      </Field>
      {tooLong && (
        <p className="field__error" role="alert">
          Keep the name to 32 bytes, about to 140 and contact to 48.
        </p>
      )}
      <TxNote state={tx.state} done="Profile saved." />
      <div className="form__actions">
        <button type="submit" className="btn btn--primary" disabled={tx.busy || tooLong || unchanged}>
          Save profile
        </button>
      </div>
    </form>
  )
}
