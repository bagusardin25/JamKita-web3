import { useId, useState } from 'react'
import { ClockRing } from '../components/ClockRing'
import { ByteCount, Field, PublicNote, TxNote } from '../components/bits'
import { LIMITS } from '../config/site'
import { prepare } from '../lib/contract'
import type { JoinMode } from '../lib/contract'
import { byteLength, cleanLine } from '../lib/format'
import { floorUnits } from '../lib/hours'
import { href, navigate } from '../lib/router'
import { useTx } from '../lib/tx'
import { useWallet } from '../lib/wallet'

export function NewGuyub() {
  const ids = useId()
  const wallet = useWallet()
  const tx = useTx()
  const [name, setName] = useState('')
  const [about, setAbout] = useState('')
  const [credit, setCredit] = useState<number>(LIMITS.creditDefault)
  const [mode, setMode] = useState<JoinMode>('open')
  const [touched, setTouched] = useState(false)

  const nameClean = cleanLine(name)
  const aboutClean = cleanLine(about)
  const nameBytes = byteLength(nameClean)
  const nameError =
    nameBytes < LIMITS.nameMin
      ? 'Give the guyub a name of at least 3 characters.'
      : nameBytes > LIMITS.nameMax
        ? `Keep the name to ${LIMITS.nameMax} bytes.`
        : undefined
  const aboutError = byteLength(aboutClean) > LIMITS.about ? `Keep the description to ${LIMITS.about} bytes.` : undefined

  const submit = async () => {
    setTouched(true)
    if (nameError || aboutError) return
    const outcome = await tx.run((account) => prepare.createGuyub(account, nameClean, aboutClean, credit, mode))
    if (outcome) navigate(href.guyub(outcome.result))
  }

  return (
    <div className="wrap page page--narrow">
      <a className="back-link" href={href.home}>
        All guyubs
      </a>
      <h1 className="page__title">Start a guyub</h1>
      <p className="page__lead">
        A guyub is a small circle of people who know each other and trade help. You become its steward and first
        member. Opening one costs only the network fee.
      </p>

      <form
        className="card form form--page"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <Field
          id={`${ids}-name`}
          label="Name"
          hint="Your street, club or class. For example: RT 05 Kampung Baru."
          error={touched ? nameError : undefined}
          counter={<ByteCount text={nameClean} max={LIMITS.nameMax} />}
        >
          <input
            id={`${ids}-name`}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={touched && !!nameError}
            aria-describedby={`${ids}-name-hint${touched && nameError ? ` ${ids}-name-error` : ''}`}
            autoComplete="off"
          />
        </Field>

        <Field
          id={`${ids}-about`}
          label="What is it for? (optional)"
          error={touched ? aboutError : undefined}
          counter={<ByteCount text={aboutClean} max={LIMITS.about} />}
        >
          <textarea
            id={`${ids}-about`}
            rows={3}
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            placeholder="Who it is for and what kind of help people swap."
          />
        </Field>

        <fieldset className="credit">
          <legend className="field__label">Credit limit</legend>
          <div className="credit__grid">
            <div>
              <p className="field__hint">
                How far below zero a member may go. Someone has to receive help before anyone has hours to give, so the
                guyub needs a little room to start. Smaller is safer.
              </p>
              <label className="credit__slider">
                <span className="visually-hidden">Credit limit in hours</span>
                <input
                  type="range"
                  min={LIMITS.creditMin}
                  max={LIMITS.creditMax}
                  step={1}
                  value={credit}
                  onChange={(e) => setCredit(Number(e.target.value))}
                  aria-valuetext={`${credit} hours below zero`}
                />
              </label>
              <p className="credit__value num">
                <strong>{credit} h</strong> below zero <span className="t-sub">(2 to 20; 5 is a good start)</span>
              </p>
            </div>
            <ClockRing units={floorUnits(credit)} creditHours={credit} size="md" caption="lowest balance" />
          </div>
        </fieldset>

        <fieldset className="segmented segmented--stack">
          <legend className="field__label">Who can join</legend>
          <label className={`segmented__option ${mode === 'open' ? 'is-on' : ''}`}>
            <input type="radio" name={`${ids}-mode`} checked={mode === 'open'} onChange={() => setMode('open')} />
            <span>
              <strong>Open</strong> · anyone with the link joins at once
            </span>
          </label>
          <label className={`segmented__option ${mode === 'approval' ? 'is-on' : ''}`}>
            <input type="radio" name={`${ids}-mode`} checked={mode === 'approval'} onChange={() => setMode('approval')} />
            <span>
              <strong>With approval</strong> · you approve each request in your inbox
            </span>
          </label>
        </fieldset>

        <PublicNote>The name, description and everything that happens in the guyub are public and permanent.</PublicNote>
        <TxNote state={tx.state} done="Your guyub is open. Taking you there…" />

        <div className="form__actions">
          <button type="submit" className="btn btn--primary" disabled={tx.busy}>
            {wallet.active ? 'Open the guyub' : 'Connect a wallet to continue'}
          </button>
          <a className="btn btn--quiet" href={href.home}>
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
