import { useEffect, useRef } from 'react'
import { Footer, Header, Notices } from './components/Chrome'
import { WalletDialog } from './components/WalletDialog'
import { href, useRoute } from './lib/router'
import type { Route } from './lib/router'
import { WalletProvider } from './lib/wallet'
import { About } from './pages/About'
import { Home } from './pages/Home'
import { Inbox } from './pages/Inbox'
import { MyHours } from './pages/MyHours'
import { NewGuyub } from './pages/NewGuyub'
import { GuyubPage } from './pages/guyub/GuyubPage'

const TITLES: Record<Route['name'], string> = {
  home: 'Jamkita — a time bank for neighbours, on BOT Chain',
  guyub: 'Guyub · Jamkita',
  new: 'Start a guyub · Jamkita',
  inbox: 'Inbox · Jamkita',
  me: 'My hours · Jamkita',
  about: 'Rules and privacy · Jamkita',
  notfound: 'Page not found · Jamkita',
}

function NotFound() {
  return (
    <div className="wrap page page--narrow">
      <div className="state state--empty">
        <h1 className="page__title">Nothing at this address</h1>
        <p>This page does not exist. The guyubs are this way.</p>
        <a className="btn btn--primary" href={href.home}>
          See all guyubs
        </a>
      </div>
    </div>
  )
}

function Page({ route }: { route: Route }) {
  switch (route.name) {
    case 'home':
      return <Home />
    case 'guyub':
      return <GuyubPage key={String(route.id)} id={route.id} tab={route.tab} />
    case 'new':
      return <NewGuyub />
    case 'inbox':
      return <Inbox />
    case 'me':
      return <MyHours />
    case 'about':
      return <About />
    case 'notfound':
      return <NotFound />
  }
}

export default function App() {
  const route = useRoute()
  const main = useRef<HTMLElement>(null)
  const first = useRef(true)
  // Switching tabs inside a guyub keeps the scroll position; changing pages does not.
  const pageKey = route.name === 'guyub' ? `guyub:${route.id}` : route.name

  useEffect(() => {
    document.title = TITLES[route.name]
    if (first.current) {
      first.current = false
      return
    }
    window.scrollTo(0, 0)
    main.current?.focus({ preventScroll: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey])

  return (
    <WalletProvider>
      <a
        className="skip-link"
        href={href.home}
        onClick={(event) => {
          event.preventDefault()
          main.current?.focus()
        }}
      >
        Skip to content
      </a>
      <Header route={route} />
      <Notices />
      <main id="main" ref={main} tabIndex={-1}>
        <Page route={route} />
      </main>
      <Footer />
      <WalletDialog />
    </WalletProvider>
  )
}
