import type { Address } from 'viem'
import { jamkitaAbi } from '../config/abi'
import { CONTRACT_ADDRESS, chain } from '../config/chains'
import { publicClient } from './client'

// ───────────────────────────── Shapes ─────────────────────────────

export type JoinMode = 'open' | 'approval'
export type MemberStatus = 'none' | 'pending' | 'active' | 'left' | 'removed'
export type ListingKind = 'offer' | 'request'
export type RequestStatus = 'pending' | 'approved' | 'declined' | 'cancelled'
export type EntryKind = 'give' | 'request' | 'donation' | 'grant' | 'leave' | 'removal'

const JOIN_MODES: JoinMode[] = ['open', 'approval']
const STATUSES: MemberStatus[] = ['none', 'pending', 'active', 'left', 'removed']
const LISTING_KINDS: ListingKind[] = ['offer', 'request']
const REQUEST_STATUSES: RequestStatus[] = ['pending', 'approved', 'declined', 'cancelled']
const ENTRY_KINDS: EntryKind[] = ['give', 'request', 'donation', 'grant', 'leave', 'removal']

export type Guyub = {
  id: bigint
  name: string
  about: string
  steward: Address
  createdAt: number
  creditHours: number
  joinMode: JoinMode
  activeMembers: number
  pendingMembers: number
  /** Units in the commons pot. Can be negative after it covers a removed member's debt. */
  commons: number
  unitsExchanged: number
  exchanges: number
  listings: number
  requests: number
  ledgerSize: number
}

export type Member = {
  wallet: Address
  status: MemberStatus
  balance: number
  earned: number
  paid: number
  exchanges: number
  since: number
}

export type Listing = {
  id: bigint
  guyubId: bigint
  poster: Address
  kind: ListingKind
  category: number
  open: boolean
  postedAt: number
  exchanges: number
  unitsLinked: number
  title: string
  detail: string
}

export type HourRequest = {
  id: bigint
  guyubId: bigint
  helper: Address
  payer: Address
  units: number
  status: RequestStatus
  createdAt: number
  resolvedAt: number
  listingId: bigint
  memo: string
}

export type Entry = {
  index: number
  from: Address
  to: Address
  kind: EntryKind
  units: number
  time: number
  listingId: bigint
  requestId: bigint
  memo: string
}

export type JoinRequest = { guyubId: bigint; wallet: Address; since: number }

export type Profile = { name: string; about: string; contact: string; updatedAt: number }

export type Stats = {
  guyubs: number
  wallets: number
  members: number
  exchanges: number
  unitsExchanged: number
  listings: number
}

export type Inbox = { toApprove: HourRequest[]; sent: HourRequest[]; joins: JoinRequest[] }

/** The commons pot is the zero address in the ledger. */
export const COMMONS: Address = '0x0000000000000000000000000000000000000000'
export const isCommons = (address: string): boolean => /^0x0{40}$/i.test(address)

export class NotDeployedError extends Error {
  constructor() {
    super(`Jamkita has not been deployed on ${chain.name} yet.`)
    this.name = 'NotDeployedError'
  }
}

export class GuyubMissingError extends Error {
  constructor() {
    super('That guyub does not exist.')
    this.name = 'GuyubMissingError'
  }
}

function contract() {
  if (!CONTRACT_ADDRESS) throw new NotDeployedError()
  return { address: CONTRACT_ADDRESS, abi: jamkitaAbi } as const
}

// viem decodes small integers as numbers and wide ones as bigints; normalise both.
const n = (value: number | bigint): number => Number(value)

type RawGuyub = {
  id: bigint
  name: string
  about: string
  steward: Address
  createdAt: number | bigint
  creditHours: number | bigint
  joinMode: number | bigint
  activeMembers: number | bigint
  pendingMembers: number | bigint
  commons: number | bigint
  unitsExchanged: number | bigint
  exchanges: number | bigint
  listings: number | bigint
  requests: number | bigint
  ledgerSize: number | bigint
}

const toGuyub = (g: RawGuyub): Guyub => ({
  id: g.id,
  name: g.name,
  about: g.about,
  steward: g.steward,
  createdAt: n(g.createdAt),
  creditHours: n(g.creditHours),
  joinMode: JOIN_MODES[n(g.joinMode)] ?? 'open',
  activeMembers: n(g.activeMembers),
  pendingMembers: n(g.pendingMembers),
  commons: n(g.commons),
  unitsExchanged: n(g.unitsExchanged),
  exchanges: n(g.exchanges),
  listings: n(g.listings),
  requests: n(g.requests),
  ledgerSize: n(g.ledgerSize),
})

type RawMember = {
  wallet: Address
  status: number | bigint
  balance: number | bigint
  earned: number | bigint
  paid: number | bigint
  exchanges: number | bigint
  since: number | bigint
}

const toMember = (m: RawMember): Member => ({
  wallet: m.wallet,
  status: STATUSES[n(m.status)] ?? 'none',
  balance: n(m.balance),
  earned: n(m.earned),
  paid: n(m.paid),
  exchanges: n(m.exchanges),
  since: n(m.since),
})

type RawListing = {
  id: bigint
  guyubId: bigint
  poster: Address
  kind: number | bigint
  category: number | bigint
  open: boolean
  postedAt: number | bigint
  exchanges: number | bigint
  unitsLinked: number | bigint
  title: string
  detail: string
}

const toListing = (l: RawListing): Listing => ({
  id: l.id,
  guyubId: l.guyubId,
  poster: l.poster,
  kind: LISTING_KINDS[n(l.kind)] ?? 'offer',
  category: n(l.category),
  open: l.open,
  postedAt: n(l.postedAt),
  exchanges: n(l.exchanges),
  unitsLinked: n(l.unitsLinked),
  title: l.title,
  detail: l.detail,
})

type RawRequest = {
  id: bigint
  guyubId: bigint
  helper: Address
  payer: Address
  units: number | bigint
  status: number | bigint
  createdAt: number | bigint
  resolvedAt: number | bigint
  listingId: number | bigint
  memo: string
}

const toRequest = (r: RawRequest): HourRequest => ({
  id: r.id,
  guyubId: r.guyubId,
  helper: r.helper,
  payer: r.payer,
  units: n(r.units),
  status: REQUEST_STATUSES[n(r.status)] ?? 'pending',
  createdAt: n(r.createdAt),
  resolvedAt: n(r.resolvedAt),
  listingId: BigInt(r.listingId),
  memo: r.memo,
})

type RawEntry = {
  index: bigint
  from: Address
  to: Address
  kind: number | bigint
  units: number | bigint
  time: number | bigint
  listingId: number | bigint
  requestId: number | bigint
  memo: string
}

const toEntry = (e: RawEntry): Entry => ({
  index: n(e.index),
  from: e.from,
  to: e.to,
  kind: ENTRY_KINDS[n(e.kind)] ?? 'give',
  units: n(e.units),
  time: n(e.time),
  listingId: BigInt(e.listingId),
  requestId: BigInt(e.requestId),
  memo: e.memo,
})

const PAGE = 100n

// ───────────────────────────── Reads ─────────────────────────────

export async function fetchStats(): Promise<Stats> {
  const [guyubs, wallets, members, exchanges, unitsExchanged, listings] = await publicClient.readContract({
    ...contract(),
    functionName: 'stats',
  })
  return {
    guyubs: n(guyubs),
    wallets: n(wallets),
    members: n(members),
    exchanges: n(exchanges),
    unitsExchanged: n(unitsExchanged),
    listings: n(listings),
  }
}

/** Newest first, up to `max` guyubs. */
export async function fetchGuyubs(max = 300): Promise<Guyub[]> {
  const out: Guyub[] = []
  let cursor = 0n
  do {
    const [page, next] = await publicClient.readContract({ ...contract(), functionName: 'getGuyubs', args: [cursor, PAGE] })
    out.push(...page.map(toGuyub))
    cursor = next
  } while (cursor !== 0n && out.length < max)
  return out
}

export async function fetchGuyub(id: bigint): Promise<Guyub> {
  const c = contract()
  const count = await publicClient.readContract({ ...c, functionName: 'guyubCount' })
  if (id < 1n || id > count) throw new GuyubMissingError()
  return toGuyub(await publicClient.readContract({ ...c, functionName: 'getGuyub', args: [id] }))
}

/** Every wallet that has ever been a member, in the order they first joined. */
export async function fetchMembers(id: bigint): Promise<Member[]> {
  const out: Member[] = []
  let cursor = 0n
  do {
    const [page, next] = await publicClient.readContract({ ...contract(), functionName: 'getMembers', args: [id, cursor, 200n] })
    out.push(...page.map(toMember))
    cursor = next
  } while (cursor !== 0n)
  return out
}

export async function fetchMember(id: bigint, wallet: Address): Promise<Member> {
  return toMember(await publicClient.readContract({ ...contract(), functionName: 'memberOf', args: [id, wallet] }))
}

export async function fetchPending(id: bigint): Promise<Member[]> {
  const page = await publicClient.readContract({ ...contract(), functionName: 'getPendingMembers', args: [id] })
  return page.map(toMember)
}

/** Newest first. */
export async function fetchListings(id: bigint, max = 300): Promise<Listing[]> {
  const out: Listing[] = []
  let cursor = 0n
  do {
    const [page, next] = await publicClient.readContract({ ...contract(), functionName: 'getListings', args: [id, cursor, PAGE] })
    out.push(...page.map(toListing))
    cursor = next
  } while (cursor !== 0n && out.length < max)
  return out
}

/** Newest first, up to `max` entries. `more` says whether older entries were left out. */
export async function fetchLedger(id: bigint, max = 300): Promise<{ entries: Entry[]; more: boolean }> {
  const out: Entry[] = []
  let cursor = 0n
  do {
    const [page, next] = await publicClient.readContract({ ...contract(), functionName: 'getLedger', args: [id, cursor, PAGE] })
    out.push(...page.map(toEntry))
    cursor = next
  } while (cursor !== 0n && out.length < max)
  return { entries: out, more: cursor !== 0n }
}

/** Newest first. */
export async function fetchRequests(id: bigint, max = 200): Promise<HourRequest[]> {
  const out: HourRequest[] = []
  let cursor = 0n
  do {
    const [page, next] = await publicClient.readContract({ ...contract(), functionName: 'getRequests', args: [id, cursor, PAGE] })
    out.push(...page.map(toRequest))
    cursor = next
  } while (cursor !== 0n && out.length < max)
  return out
}

export async function fetchInbox(wallet: Address): Promise<Inbox> {
  const [toApprove, sent, joins] = await publicClient.readContract({ ...contract(), functionName: 'inboxOf', args: [wallet] })
  const newestFirst = (a: HourRequest, b: HourRequest) => (a.id > b.id ? -1 : 1)
  return {
    toApprove: toApprove.map(toRequest).sort(newestFirst),
    sent: sent.map(toRequest).sort(newestFirst),
    joins: joins.map((j) => ({ guyubId: j.guyubId, wallet: j.wallet, since: n(j.since) })),
  }
}

export type Membership = { guyub: Guyub; member: Member }

/** Every guyub the wallet has joined or asked to join, newest first. */
export async function fetchMemberships(wallet: Address): Promise<Membership[]> {
  const c = contract()
  const ids = await publicClient.readContract({ ...c, functionName: 'guyubsOf', args: [wallet] })
  const rows = await Promise.all(
    [...ids].reverse().map(async (id) => {
      const [g, m] = await Promise.all([
        publicClient.readContract({ ...c, functionName: 'getGuyub', args: [id] }),
        publicClient.readContract({ ...c, functionName: 'memberOf', args: [id, wallet] }),
      ])
      return { guyub: toGuyub(g), member: toMember(m) }
    }),
  )
  return rows
}

export async function fetchProfile(wallet: Address): Promise<Profile> {
  const p = await publicClient.readContract({ ...contract(), functionName: 'profileOf', args: [wallet] })
  return { name: p.name, about: p.about, contact: p.contact, updatedAt: n(p.updatedAt) }
}

export async function fetchProfiles(wallets: readonly Address[]): Promise<Profile[]> {
  if (wallets.length === 0) return []
  const list = await publicClient.readContract({ ...contract(), functionName: 'getProfiles', args: [wallets] })
  return list.map((p) => ({ name: p.name, about: p.about, contact: p.contact, updatedAt: n(p.updatedAt) }))
}

// ───────────────────────────── Writes ─────────────────────────────
//
// Each function dry-runs the call first. A rule the contract would reject surfaces here as a
// readable error before the wallet is asked to sign anything.

const sim = (account: Address) => ({ ...contract(), account })

export const prepare = {
  createGuyub: (account: Address, name: string, about: string, creditHours: number, joinMode: JoinMode) =>
    publicClient.simulateContract({
      ...sim(account),
      functionName: 'createGuyub',
      args: [name, about, creditHours, joinMode === 'open' ? 0 : 1],
    }),

  join: (account: Address, id: bigint) => publicClient.simulateContract({ ...sim(account), functionName: 'join', args: [id] }),

  leave: (account: Address, id: bigint) => publicClient.simulateContract({ ...sim(account), functionName: 'leave', args: [id] }),

  approveMember: (account: Address, id: bigint, wallet: Address) =>
    publicClient.simulateContract({ ...sim(account), functionName: 'approveMember', args: [id, wallet] }),

  declineMember: (account: Address, id: bigint, wallet: Address) =>
    publicClient.simulateContract({ ...sim(account), functionName: 'declineMember', args: [id, wallet] }),

  removeMember: (account: Address, id: bigint, wallet: Address) =>
    publicClient.simulateContract({ ...sim(account), functionName: 'removeMember', args: [id, wallet] }),

  transferSteward: (account: Address, id: bigint, wallet: Address) =>
    publicClient.simulateContract({ ...sim(account), functionName: 'transferSteward', args: [id, wallet] }),

  postListing: (account: Address, id: bigint, kind: ListingKind, category: number, title: string, detail: string) =>
    publicClient.simulateContract({
      ...sim(account),
      functionName: 'postListing',
      args: [id, kind === 'offer' ? 0 : 1, category, title, detail],
    }),

  closeListing: (account: Address, listingId: bigint) =>
    publicClient.simulateContract({ ...sim(account), functionName: 'closeListing', args: [listingId] }),

  giveHours: (account: Address, id: bigint, to: Address, units: number, memo: string, listingId: bigint) =>
    publicClient.simulateContract({ ...sim(account), functionName: 'giveHours', args: [id, to, BigInt(units), memo, listingId] }),

  requestHours: (account: Address, id: bigint, from: Address, units: number, memo: string, listingId: bigint) =>
    publicClient.simulateContract({
      ...sim(account),
      functionName: 'requestHours',
      args: [id, from, BigInt(units), memo, listingId],
    }),

  approveRequest: (account: Address, requestId: bigint) =>
    publicClient.simulateContract({ ...sim(account), functionName: 'approveRequest', args: [requestId] }),

  declineRequest: (account: Address, requestId: bigint) =>
    publicClient.simulateContract({ ...sim(account), functionName: 'declineRequest', args: [requestId] }),

  cancelRequest: (account: Address, requestId: bigint) =>
    publicClient.simulateContract({ ...sim(account), functionName: 'cancelRequest', args: [requestId] }),

  donate: (account: Address, id: bigint, units: number) =>
    publicClient.simulateContract({ ...sim(account), functionName: 'donate', args: [id, BigInt(units)] }),

  grant: (account: Address, id: bigint, to: Address, units: number, memo: string) =>
    publicClient.simulateContract({ ...sim(account), functionName: 'grant', args: [id, to, BigInt(units), memo] }),

  setProfile: (account: Address, name: string, about: string, contact: string) =>
    publicClient.simulateContract({ ...sim(account), functionName: 'setProfile', args: [name, about, contact] }),
}
