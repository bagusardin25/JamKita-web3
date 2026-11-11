import { Inbox as InboxIcon, Wallet } from 'lucide-react'
import { CONTRACT_ADDRESS, NETWORK, chain, explorerAddressUrl } from '../config/chains'
import { SITE } from '../config/site'
import { shortAddress } from '../lib/format'
import { href } from '../lib/router'
import type { Route } from '../lib/router'
import { displayName, useProfile } from '../lib/store'
import { useInbox } from '../lib/inbox'
import { useWallet } from '../lib/wallet'
import { ClockRing } from './ClockRing'

function Brand() {
  return (
    <a className="brand" href={href.home} aria-label="Jamkita home">
      <ClockRing units={14} size="sm" className="brand__ring" />
      <span className="brand__name">Jamkita</span>
    </a>
  )
}

function WalletButton() {
  const wallet = useWallet()
  const profile = useProfile(wallet.active?.account)
  if (!wallet.active) {
    return (
      <button type="button" className="btn btn--primary btn--small" onClick={wallet.openDialog}>
        <Wallet size={16} aria-hidden="true" />
        Connect wallet
      </button>
    )
  }
  return (
    <button
      type="button"
      className={`account-chip ${wallet.wrongChain ? 'account-chip--warn' : ''}`}
      onClick={wallet.openDialog}
      aria-label={`Wallet: ${displayName(wallet.active.account, profile)}${wallet.wrongChain ? ', wrong network' : ''}`}
    >
      <span className="account-chip__dot" aria-hidden="true" />
      <span className="account-chip__name">{profile?.name || shortAddress(wallet.active.account)}</span>
      {wallet.wrongChain && <span className="account-chip__flag">Wrong network</span>}
    </button>
  )
}

export function Header({ route }: { route: Route }) {
  const { waiting } = useInbox()
  const { active } = useWallet()
  const links = [
    { to: href.home, label: 'Guyubs', on: route.name === 'home' || route.name === 'guyub' || route.name === 'new' },
    { to: href.inbox, label: 'Inbox', on: route.name === 'inbox', badge: active ? waiting : 0 },
    { to: href.me, label: 'My hours', on: route.name === 'me' },
    { to: href.about, label: 'About', on: route.name === 'about' },
  ]
  return (
    <header className="topbar">
      <div className="wrap topbar__row">
        <Brand />
        <nav className="nav" aria-label="Main">
          <ul>
            {links.map((link) => (
              <li key={link.to}>
                <a className={`nav__link ${link.on ? 'is-on' : ''}`} href={link.to} aria-current={link.on ? 'page' : undefined}>
                  {link.label === 'Inbox' && <InboxIcon size={16} aria-hidden="true" className="nav__icon" />}
                  {link.label}
                  {link.badge ? (
                    <span className="nav__badge num" aria-label={`, ${link.badge} waiting`}>
                      {link.badge}
                    </span>
                  ) : null}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="topbar__wallet">
          <WalletButton />
        </div>
      </div>
    </header>
  )
}

export function Notices() {
  const wallet = useWallet()
  return (
    <>
      {NETWORK !== 'mainnet' && (
        <div className="banner banner--info" role="note">
          <div className="wrap">
            {NETWORK === 'local'
              ? 'Local test chain. Sample guyubs and dev wallets only; nothing here is real.'
              : `${chain.name}: test hours on a test network.`}
          </div>
        </div>
      )}
      {!CONTRACT_ADDRESS && (
        <div className="banner banner--warn" role="status">
          <div className="wrap">Jamkita has not been deployed on {chain.name} yet. Guyubs will appear here once it is.</div>
        </div>
      )}
      {wallet.wrongChain && (
        <div className="banner banner--warn" role="status">
          <div className="wrap banner__row">
            <span>Your wallet is on another network. Jamkita runs on {chain.name}.</span>
            <button type="button" className="btn btn--secondary btn--small" onClick={() => void wallet.switchChain()}>
              Switch to {chain.name}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export function Footer() {
  const contractUrl = CONTRACT_ADDRESS ? explorerAddressUrl(CONTRACT_ADDRESS) : undefined
  return (
    <footer className="footer">
      <div className="wrap footer__grid">
        <div className="footer__about">
          <Brand />
          <p>
            A time bank for neighbours. <strong>Hours are not money:</strong> they cannot be bought, sold or turned
            into BOT, and in every guyub the balances add up to zero.
          </p>
        </div>
        <div>
          <h2 className="footer__title">Built on BOT Chain</h2>
          <ul className="footer__links">
            <li>
              <a href={SITE.botchainUrl} target="_blank" rel="noreferrer">
                BOT Chain · botchain.ai
              </a>
            </li>
            <li>
              <a href={SITE.botchainScanUrl} target="_blank" rel="noreferrer">
                Explorer · scan.botchain.ai
              </a>
            </li>
            {SITE.xUrl && (
              <li>
                <a href={SITE.xUrl} target="_blank" rel="noreferrer">
                  Jamkita on X
                </a>
              </li>
            )}
          </ul>
        </div>
        <div>
          <h2 className="footer__title">Contract</h2>
          {CONTRACT_ADDRESS ? (
            contractUrl ? (
              <a className="mono wrap-anywhere" href={contractUrl} target="_blank" rel="noreferrer">
                {CONTRACT_ADDRESS}
              </a>
            ) : (
              <span className="mono wrap-anywhere">{CONTRACT_ADDRESS}</span>
            )
          ) : (
            <span>Not deployed on {chain.name} yet</span>
          )}
          <p className="footer__fine">
            {chain.name} · chain ID {chain.id}
          </p>
          <p className="footer__fine">
            <a href={href.about}>Rules and privacy</a>
          </p>
        </div>
      </div>
    </footer>
  )
}
