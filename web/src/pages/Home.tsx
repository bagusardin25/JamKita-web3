import { useMemo, useState } from 'react'
import { ArrowRight, Plus, Search } from 'lucide-react'
import { ClockRing } from '../components/ClockRing'
import { Empty, ErrorState, Loading } from '../components/bits'
import { CONTRACT_ADDRESS } from '../config/chains'
import { fetchGuyubs, fetchStats } from '../lib/contract'
import type { Guyub } from '../lib/contract'
import { plural, timeAgo } from '../lib/format'
import { hoursShort } from '../lib/hours'
import { href } from '../lib/router'
import { useAsync } from '../lib/useAsync'

function Hero() {
  return (
    <section className="hero">
      <div className="wrap hero__grid">
        <div className="hero__text">
          <p className="eyebrow">A time bank for neighbours</p>
          <h1 className="hero__title">Help each other. Pay in hours, not money.</h1>
          <p className="hero__lead">
            Start a <em>guyub</em> with people you know: your street, your club, your class. Teach someone Excel for
            an hour and you earn one hour. Spend it on a bike repair, a lift to the market or an afternoon of
            babysitting. One hour is one hour, whatever the help.
          </p>
          <div className="hero__actions">
            <a className="btn btn--primary" href={href.newGuyub}>
              <Plus size={18} aria-hidden="true" />
              Start a guyub
            </a>
            <a className="btn btn--secondary" href={href.about}>
              How it works
            </a>
          </div>
        </div>

        <figure className="hero__figure" aria-labelledby="hero-figure-caption">
          <div className="example-tag">Example</div>
          <ClockRing units={9} creditHours={5} size="lg" caption="your balance" />
          <figcaption id="hero-figure-caption" className="legend">
            <span className="legend__item">
              <ClockRing units={8} size="sm" />
              <span>
                <strong>+ Clockwise</strong> · you gave more help than you received
              </span>
            </span>
            <span className="legend__item">
              <ClockRing units={-6} size="sm" />
              <span>
                <strong>− Counter-clockwise</strong> · you received more; others carry you for now
              </span>
            </span>
            <span className="legend__fine">One segment is one hour. The notch marks how far below zero the guyub lets you go.</span>
          </figcaption>
        </figure>
      </div>
    </section>
  )
}

function NotMoney() {
  return (
    <section className="wrap">
      <div className="pledge">
        <h2 className="pledge__title">Hours are not money</h2>
        <p>
          Nobody mints hours and nobody sells them. Everyone starts at zero, and every hour you receive is an hour
          someone else gave. In every guyub, all balances plus the commons add up to exactly zero — the contract makes
          sure of it, and no steward can change that.
        </p>
      </div>
    </section>
  )
}

function Stats() {
  const stats = useAsync(CONTRACT_ADDRESS ? 'stats' : null, fetchStats)
  const s = stats.data
  const items = [
    { label: 'Guyubs', value: s ? String(s.guyubs) : '–' },
    { label: 'Neighbours', value: s ? String(s.wallets) : '–' },
    { label: 'Exchanges', value: s ? String(s.exchanges) : '–' },
    { label: 'Hours exchanged', value: s ? hoursShort(s.unitsExchanged).replace(' h', '') : '–' },
  ]
  return (
    <section className="wrap" aria-label="Across all guyubs">
      <dl className="stats">
        {items.map((item) => (
          <div key={item.label} className="stat">
            <dt className="stat__label">{item.label}</dt>
            <dd className="stat__value">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function Directory() {
  const list = useAsync(CONTRACT_ADDRESS ? 'guyubs' : null, () => fetchGuyubs())
  const [query, setQuery] = useState('')
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    const all = list.data ?? []
    return q ? all.filter((g) => g.name.toLowerCase().includes(q) || g.about.toLowerCase().includes(q)) : all
  }, [list.data, query])

  return (
    <section className="wrap section" aria-labelledby="directory-title">
      <div className="section__head">
        <div>
          <h2 id="directory-title" className="section__title">
            Guyubs
          </h2>
          <p className="section__lead">Boards and ledgers are open to read. Join one, or start your own.</p>
        </div>
        <div className="section__tools">
          <label className="search">
            <Search size={16} aria-hidden="true" />
            <span className="visually-hidden">Search guyubs</span>
            <input type="search" placeholder="Search by name" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <a className="btn btn--secondary btn--small" href={href.newGuyub}>
            <Plus size={16} aria-hidden="true" />
            Start a guyub
          </a>
        </div>
      </div>

      {!CONTRACT_ADDRESS ? (
        <Empty title="Nothing to show yet">
          <p>Guyubs will appear here once Jamkita is deployed on this network.</p>
        </Empty>
      ) : list.error && !list.data ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : !list.data ? (
        <Loading label="Reading the guyub directory…" />
      ) : list.data.length === 0 ? (
        <Empty title="No guyubs yet">
          <p>Be the first: open one for your street or your club.</p>
          <a className="btn btn--primary btn--small" href={href.newGuyub}>
            Start a guyub
          </a>
        </Empty>
      ) : shown.length === 0 ? (
        <Empty title={`Nothing matches “${query}”`}>
          <button type="button" className="btn btn--quiet btn--small" onClick={() => setQuery('')}>
            Clear search
          </button>
        </Empty>
      ) : (
        <DirectoryTable guyubs={shown} />
      )}
    </section>
  )
}

function DirectoryTable({ guyubs }: { guyubs: Guyub[] }) {
  return (
    <div className="table-card">
      <table className="table table--cards">
        <caption className="visually-hidden">All guyubs, newest first</caption>
        <thead>
          <tr>
            <th scope="col">Guyub</th>
            <th scope="col" className="t-num">
              Members
            </th>
            <th scope="col" className="t-num">
              Hours exchanged
            </th>
            <th scope="col" className="t-num">
              Credit limit
            </th>
            <th scope="col">Joining</th>
            <th scope="col">
              <span className="visually-hidden">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {guyubs.map((g) => (
            <tr key={String(g.id)}>
              <th scope="row" className="t-main">
                <a className="t-title" href={href.guyub(g.id)}>
                  {g.name}
                </a>
                {g.about && <span className="t-sub">{g.about}</span>}
                <span className="t-sub t-sub--fine">Opened {timeAgo(g.createdAt)}</span>
              </th>
              <td className="t-num" data-label="Members">
                {g.activeMembers}
              </td>
              <td className="t-num" data-label="Hours exchanged">
                {hoursShort(g.unitsExchanged)}
                <span className="t-sub t-sub--fine">{plural(g.exchanges, 'exchange')}</span>
              </td>
              <td className="t-num" data-label="Credit limit">
                {g.creditHours} h
              </td>
              <td data-label="Joining">
                <span className={`tag ${g.joinMode === 'open' ? 'tag--leaf' : 'tag--plain'}`}>
                  {g.joinMode === 'open' ? 'Open' : 'With approval'}
                </span>
              </td>
              <td className="t-action">
                <a className="btn btn--quiet btn--small" href={href.guyub(g.id)} aria-label={`Open ${g.name}`}>
                  Open
                  <ArrowRight size={16} aria-hidden="true" />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function HowItWorks() {
  const steps = [
    {
      title: 'Start or join a guyub',
      text: 'Choose how far below zero members may go, and whether anyone can join or you approve each person.',
    },
    {
      title: 'Post what you can do',
      text: 'Offers ("I can…") and requests ("I need…") go on the board. Agree the details between yourselves.',
    },
    {
      title: 'Settle in hours',
      text: 'Whoever was helped pays in one step, or the helper asks and the other side approves. The ledger shows it all.',
    },
  ]
  return (
    <section className="wrap section" aria-labelledby="how-title">
      <h2 id="how-title" className="section__title">
        How it works
      </h2>
      <ol className="steps">
        {steps.map((step, i) => (
          <li key={step.title} className="step">
            <span className="step__n num" aria-hidden="true">
              {i + 1}
            </span>
            <h3 className="step__title">{step.title}</h3>
            <p>{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function Home() {
  return (
    <div className="page page--home">
      <Hero />
      <Stats />
      <Directory />
      <NotMoney />
      <HowItWorks />
    </div>
  )
}
