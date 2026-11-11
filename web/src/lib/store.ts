import { useEffect, useSyncExternalStore } from 'react'
import type { Address } from 'viem'
import { fetchProfiles } from './contract'
import type { Profile } from './contract'
import { shortAddress } from './format'

// ───────────────────────────── Revision ─────────────────────────────
// Bumped after every confirmed transaction so on-screen data refetches.

let revision = 0
const revisionListeners = new Set<() => void>()

export function bumpRevision() {
  revision += 1
  revisionListeners.forEach((notify) => notify())
}

export function useRevision(): number {
  return useSyncExternalStore(
    (notify) => {
      revisionListeners.add(notify)
      return () => revisionListeners.delete(notify)
    },
    () => revision,
  )
}

// ───────────────────────────── Profiles ─────────────────────────────
// One shared cache. Profiles asked for in the same tick are fetched in a single call.

const EMPTY: Profile = { name: '', about: '', contact: '', updatedAt: 0 }
const profiles = new Map<string, Profile>() // lower-case address -> profile
const pending = new Set<Address>()
const listeners = new Set<() => void>()
let version = 0
let flushScheduled = false

function notify() {
  version += 1
  listeners.forEach((fn) => fn())
}

async function flush() {
  flushScheduled = false
  const wanted = [...pending]
  pending.clear()
  if (wanted.length === 0) return
  try {
    const result = await fetchProfiles(wanted)
    wanted.forEach((address, i) => profiles.set(address.toLowerCase(), result[i] ?? EMPTY))
    notify()
  } catch {
    // Names are a nicety. Without them the short address is shown; the next render retries.
  }
}

function request(address: Address) {
  if (profiles.has(address.toLowerCase()) || pending.has(address)) return
  pending.add(address)
  if (!flushScheduled) {
    flushScheduled = true
    setTimeout(flush, 0)
  }
}

export function rememberProfile(address: Address, profile: Profile) {
  profiles.set(address.toLowerCase(), profile)
  notify()
}

/** Forget cached profiles, e.g. after a transaction that may have changed one. */
export function forgetProfile(address: Address) {
  profiles.delete(address.toLowerCase())
  notify()
}

/** The public profile of an address, or undefined while it loads. */
export function useProfile(address: Address | undefined): Profile | undefined {
  useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => version,
  )
  useEffect(() => {
    if (address) request(address)
  })
  if (!address) return undefined
  return profiles.get(address.toLowerCase())
}

export function displayName(address: Address, profile: Profile | undefined): string {
  return profile?.name || shortAddress(address)
}
