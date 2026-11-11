import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Address } from 'viem'
import { Check, Copy, RotateCw } from 'lucide-react'
import { explorerTxUrl } from '../config/chains'
import { isCommons } from '../lib/contract'
import { describeError, isNetworkError } from '../lib/errors'
import { byteLength, sameAddress, shortAddress } from '../lib/format'
import { hoursLong, signOf, signedLong, signedShort } from '../lib/hours'
import { displayName, useProfile } from '../lib/store'
import type { TxState } from '../lib/tx'
import { useWallet } from '../lib/wallet'

/** A wallet shown by its profile name, with the short address beside it. */
export function Person({ address, plain = false }: { address: Address; plain?: boolean }) {
  const profile = useProfile(address)
  const { active } = useWallet()
  if (isCommons(address)) return <span className="person person--commons">Commons</span>
  const name = displayName(address, profile)
  const me = sameAddress(active?.account, address)
  return (
    <span className="person" title={address}>
      <span className="person__name">{name}</span>
      {me && <span className="person__you">you</span>}
      {!plain && profile?.name && <span className="person__addr mono">{shortAddress(address)}</span>}
    </span>
  )
}

/** A balance or amount with its sign spelled out. Colour only repeats what the sign says. */
export function Signed({ units, long = false, className = '' }: { units: number; long?: boolean; className?: string }) {
  return (
    <span className={`signed signed--${signOf(units)} num ${className}`} title={signedLong(units)}>
      {long ? signedLong(units) : signedShort(units)}
    </span>
  )
}

export function Hours({ units }: { units: number }) {
  return <span className="num">{hoursLong(units)}</span>
}

export function CopyButton({ text, label, className = '' }: { text: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return (
    <button
      type="button"
      className={`btn btn--secondary btn--small ${className}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          window.clearTimeout(timer.current)
          timer.current = window.setTimeout(() => setCopied(false), 1800)
        } catch {
          window.prompt('Copy this:', text)
        }
      }}
    >
      {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
      <span aria-live="polite">{copied ? 'Copied' : label}</span>
    </button>
  )
}

export function Loading({ label = 'Reading the ledger…' }: { label?: string }) {
  return (
    <div className="state state--loading" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

export function ErrorState({ error, onRetry, title }: { error: unknown; onRetry?: () => void; title?: string }) {
  const network = isNetworkError(error)
  return (
    <div className="state state--error" role="alert">
      <h2 className="state__title">{title ?? (network ? 'Could not reach the chain' : 'Something went wrong')}</h2>
      <p>{describeError(error)}</p>
      {onRetry && (
        <button type="button" className="btn btn--secondary btn--small" onClick={onRetry}>
          <RotateCw size={16} aria-hidden="true" />
          Try again
        </button>
      )}
    </div>
  )
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="state state--empty">
      <h3 className="state__title">{title}</h3>
      {children}
    </div>
  )
}

const PHASE_TEXT: Record<TxState['phase'], string> = {
  idle: '',
  preparing: 'Checking the rules…',
  wallet: 'Confirm in your wallet…',
  mining: 'Writing to the ledger…',
  done: 'Done.',
  error: '',
}

/** Progress and outcome of one transaction, announced politely to screen readers. */
export function TxNote({ state, done }: { state: TxState; done?: string }) {
  if (state.phase === 'idle') return null
  if (state.phase === 'error') {
    return (
      <p className="tx tx--error" role="alert">
        {state.error}
      </p>
    )
  }
  const link = state.hash ? explorerTxUrl(state.hash) : undefined
  return (
    <p className={`tx tx--${state.phase}`} role="status">
      {state.phase !== 'done' && <span className="spinner spinner--small" aria-hidden="true" />}
      <span>{state.phase === 'done' && done ? done : PHASE_TEXT[state.phase]}</span>
      {state.phase === 'done' && link && (
        <a href={link} target="_blank" rel="noreferrer">
          View transaction
        </a>
      )}
    </p>
  )
}

/** "12 / 140 bytes", turning to a warning near the limit. */
export function ByteCount({ text, max }: { text: string; max: number }) {
  const used = byteLength(text)
  const over = used > max
  return (
    <span className={`bytes ${over ? 'bytes--over' : used > max * 0.85 ? 'bytes--near' : ''}`} aria-live="polite">
      <span className="num">{used}</span>/<span className="num">{max}</span> bytes
    </span>
  )
}

export function Field({
  id,
  label,
  hint,
  error,
  counter,
  children,
}: {
  id: string
  label: string
  hint?: ReactNode
  error?: string
  counter?: ReactNode
  children: ReactNode
}) {
  return (
    <div className={`field ${error ? 'field--invalid' : ''}`}>
      <div className="field__top">
        <label htmlFor={id} className="field__label">
          {label}
        </label>
        {counter}
      </div>
      {children}
      {hint && (
        <p className="field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field__error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  )
}

/** A short "Public" warning shown next to anything that is stored on-chain for good. */
export function PublicNote({ children }: { children: ReactNode }) {
  return <p className="public-note">{children}</p>
}
