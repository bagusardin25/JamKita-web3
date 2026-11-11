import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from 'viem'
import { chain } from '../config/chains'
import { GuyubMissingError, NotDeployedError } from './contract'
import { hoursLong } from './hours'

type Explain = (args: readonly unknown[]) => string

/** What each contract rejection means, in words a neighbour can act on. */
const REVERTS: Record<string, string | Explain> = {
  GuyubNotFound: 'That guyub does not exist.',
  InvalidName: 'A guyub name must be between 3 and 48 bytes.',
  InvalidAbout: 'The description can be at most 200 bytes.',
  InvalidCreditLimit: 'The credit limit must be between 2 and 20 hours.',
  InvalidJoinMode: 'Choose how people join: open, or with your approval.',
  AlreadyMember: 'You are already a member of this guyub.',
  AlreadyPending: 'Your request to join is already waiting for the steward.',
  NotPending: 'That person is no longer waiting to join.',
  NotSteward: 'Only the steward of this guyub can do that.',
  NotActiveMember: 'Both people need to be active members of this guyub.',
  StewardCannotLeave: 'Hand the steward role to another member before you leave.',
  NegativeBalance: 'You can leave once your balance is back to zero or above. Help someone first.',
  CannotRemoveSteward: 'The steward cannot remove themselves.',
  AlreadySteward: 'You are already the steward.',
  InvalidKind: 'Choose offer or request.',
  InvalidCategory: 'Pick one of the listed categories.',
  InvalidTitle: 'The title must be between 3 and 64 bytes.',
  InvalidDetail: 'The details can be at most 200 bytes.',
  ListingNotFound: 'That listing does not exist.',
  ListingNotInGuyub: 'That listing belongs to another guyub.',
  NotPoster: 'Only the person who posted it can close this listing.',
  ListingAlreadyClosed: 'This listing is already closed.',
  SelfExchange: 'You cannot pay yourself or ask yourself for hours.',
  InvalidUnits: 'Choose between 15 minutes and 8 hours.',
  InvalidMemo: 'The note can be at most 140 bytes.',
  OverCreditLimit: (args) => {
    const left = Number(args[0] ?? 0)
    return left > 0
      ? `That goes past this guyub's credit limit. You can pay up to ${hoursLong(left)} right now.`
      : `Your balance is at this guyub's credit limit. Help someone to earn hours back first.`
  },
  RequestNotFound: 'That request does not exist.',
  RequestNotPending: 'This request was already approved, declined or cancelled.',
  NotPayer: 'Only the person asked to pay can answer this request.',
  NotHelper: 'Only the person who sent this request can cancel it.',
  ExceedsCommons: (args) => {
    const left = Number(args[0] ?? 0)
    return left > 0 ? `The commons only holds ${hoursLong(left)}.` : 'The commons is empty, so there is nothing to grant.'
  },
  SelfGrant: 'A steward cannot grant hours to themselves.',
  ProfileTooLong: 'Keep the name to 32 bytes, about to 140 and contact to 48.',
}

const CANCELLED = 'You cancelled the request in your wallet.'
const FALLBACK = 'Something went wrong. Please try again.'

export function describeError(err: unknown): string {
  if (err instanceof NotDeployedError || err instanceof GuyubMissingError) return err.message

  if (err instanceof BaseError) {
    if (err.walk((e) => e instanceof UserRejectedRequestError)) return CANCELLED

    const revert = err.walk((e) => e instanceof ContractFunctionRevertedError)
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName
      const explain = name ? REVERTS[name] : undefined
      if (typeof explain === 'string') return explain
      if (explain) return explain(revert.data?.args ?? [])
    }

    const text = `${err.shortMessage} ${err.message}`.toLowerCase()
    if (text.includes('insufficient funds')) return 'This wallet does not hold enough BOT to pay the network fee.'
    if (text.includes('does not match the target chain') || text.includes('chain mismatch')) {
      return `Your wallet is on another network. Switch it to ${chain.name} and try again.`
    }
    if (text.includes('http request failed') || text.includes('failed to fetch') || text.includes('timed out')) {
      return `Could not reach ${chain.name}. Check your connection and try again.`
    }
    return err.shortMessage || FALLBACK
  }

  if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === 4001) {
    return CANCELLED
  }
  if (err instanceof Error && err.message) return err.message
  return FALLBACK
}

/** True when a read failed because the network could not be reached, so a retry may help. */
export function isNetworkError(err: unknown): boolean {
  if (err instanceof NotDeployedError || err instanceof GuyubMissingError) return false
  const text = err instanceof BaseError ? `${err.shortMessage} ${err.message}` : String(err)
  return /http request failed|failed to fetch|timed out|network/i.test(text)
}
