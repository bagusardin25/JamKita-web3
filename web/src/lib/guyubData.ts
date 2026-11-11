import type { Address } from 'viem'
import { fetchGuyub, fetchLedger, fetchListings, fetchMembers, fetchPending, fetchRequests } from './contract'
import type { Entry, Guyub, HourRequest, Listing, Member } from './contract'
import { sameAddress } from './format'

/** Everything a guyub page shows, read in one go from view functions. */
export type GuyubData = {
  guyub: Guyub
  members: Member[]
  pending: Member[]
  listings: Listing[]
  entries: Entry[]
  moreEntries: boolean
  requests: HourRequest[]
}

export async function fetchGuyubData(id: bigint): Promise<GuyubData> {
  const guyub = await fetchGuyub(id)
  const [members, pending, listings, ledger, requests] = await Promise.all([
    fetchMembers(id),
    fetchPending(id),
    fetchListings(id),
    fetchLedger(id),
    fetchRequests(id),
  ])
  return { guyub, members, pending, listings, entries: ledger.entries, moreEntries: ledger.more, requests }
}

export const activeMembers = (data: GuyubData): Member[] => data.members.filter((m) => m.status === 'active')

export const memberIn = (data: GuyubData, wallet: Address | undefined): Member | undefined =>
  wallet ? (data.members.find((m) => sameAddress(m.wallet, wallet)) ?? data.pending.find((m) => sameAddress(m.wallet, wallet))) : undefined

/** The zero-sum check the ledger tab shows: member balances plus the commons. */
export function zeroSum(data: GuyubData) {
  let plus = 0
  let minus = 0
  for (const m of data.members) {
    if (m.balance > 0) plus += m.balance
    else minus += m.balance
  }
  const commons = data.guyub.commons
  return { plus, minus, commons, total: plus + minus + commons }
}
