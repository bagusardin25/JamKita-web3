import { CONTRACT_ADDRESS } from '../config/chains'
import { fetchInbox } from './contract'
import { useAsync, useInterval } from './useAsync'
import { useWallet } from './wallet'

/** Everything waiting on the connected wallet, refreshed every 20 seconds and after each transaction. */
export function useInbox() {
  const { active } = useWallet()
  const account = active?.account
  const inbox = useAsync(account && CONTRACT_ADDRESS ? `inbox:${account}` : null, () => fetchInbox(account!))
  useInterval(inbox.reload, account ? 20_000 : null)
  const waiting = inbox.data ? inbox.data.toApprove.length + inbox.data.joins.length : 0
  return { ...inbox, waiting }
}
