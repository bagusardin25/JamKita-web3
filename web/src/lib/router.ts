import { useMemo, useSyncExternalStore } from 'react'

export type GuyubTab = 'board' | 'members' | 'ledger' | 'commons'
export const GUYUB_TABS: GuyubTab[] = ['board', 'members', 'ledger', 'commons']

export type Route =
  | { name: 'home' }
  | { name: 'guyub'; id: bigint; tab: GuyubTab }
  | { name: 'new' }
  | { name: 'inbox' }
  | { name: 'me' }
  | { name: 'about' }
  | { name: 'notfound' }

/** Hash routes, so the app deploys as static files with no server rewrites. */
export const href = {
  home: '#/',
  guyub: (id: bigint | number, tab: GuyubTab = 'board') => (tab === 'board' ? `#/guyub/${id}` : `#/guyub/${id}/${tab}`),
  newGuyub: '#/new',
  inbox: '#/inbox',
  me: '#/me',
  about: '#/about',
} as const

function parse(hash: string): Route {
  const parts = hash.replace(/^#/, '').split('/').filter(Boolean)
  if (parts.length === 0) return { name: 'home' }
  const [head, arg, sub] = parts
  if (head === 'guyub' && arg && /^\d{1,18}$/.test(arg) && parts.length <= 3) {
    const tab = (sub ?? 'board') as GuyubTab
    if (!GUYUB_TABS.includes(tab)) return { name: 'notfound' }
    return { name: 'guyub', id: BigInt(arg), tab }
  }
  if (parts.length !== 1) return { name: 'notfound' }
  if (head === 'new') return { name: 'new' }
  if (head === 'inbox') return { name: 'inbox' }
  if (head === 'me') return { name: 'me' }
  if (head === 'about') return { name: 'about' }
  return { name: 'notfound' }
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  return useMemo(() => parse(hash), [hash])
}

export function navigate(to: string) {
  window.location.hash = to
}

/** Absolute link to a route, for copying and sharing. */
export function absoluteUrl(to: string): string {
  return `${window.location.origin}${window.location.pathname}${to}`
}
