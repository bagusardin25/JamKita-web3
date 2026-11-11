import type { EntryKind } from './contract'

/** How each kind of ledger entry is named on screen. */
export const ENTRY_LABEL: Record<EntryKind, string> = {
  give: 'Paid for help',
  request: 'Request approved',
  donation: 'Gave to the commons',
  grant: 'Grant from the commons',
  leave: 'Left the guyub',
  removal: 'Removed by the steward',
}
