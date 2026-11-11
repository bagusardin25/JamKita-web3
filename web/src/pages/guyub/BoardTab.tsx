import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Empty, Person } from '../../components/bits'
import { CATEGORIES } from '../../config/site'
import type { Listing } from '../../lib/contract'
import { plural, sameAddress, timeAgo } from '../../lib/format'
import type { GuyubData } from '../../lib/guyubData'
import { hoursShort } from '../../lib/hours'
import { useWallet } from '../../lib/wallet'
import type { GuyubAction } from './GuyubPage'

type Filter = 'all' | 'offer' | 'request'

export function BoardTab({ data, canAct, onAction }: { data: GuyubData; canAct: boolean; onAction: (a: GuyubAction) => void }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [category, setCategory] = useState(-1)
  const [showClosed, setShowClosed] = useState(false)

  const open = data.listings.filter((l) => l.open)
  const closed = data.listings.filter((l) => !l.open)
  const matches = (l: Listing) => (filter === 'all' || l.kind === filter) && (category < 0 || l.category === category)
  const shown = (showClosed ? data.listings : open).filter(matches)

  return (
    <section aria-labelledby="board-title">
      <div className="panel-head">
        <div>
          <h2 id="board-title" className="panel-head__title">
            Board
          </h2>
          <p className="panel-head__lead">What neighbours can do, and what they need. Agree the details between yourselves.</p>
        </div>
        {canAct && (
          <div className="panel-head__tools">
            <button type="button" className="btn btn--secondary btn--small" onClick={() => onAction({ type: 'post', kind: 'offer' })}>
              <Plus size={16} aria-hidden="true" />
              Offer help
            </button>
            <button type="button" className="btn btn--secondary btn--small" onClick={() => onAction({ type: 'post', kind: 'request' })}>
              <Plus size={16} aria-hidden="true" />
              Ask for help
            </button>
          </div>
        )}
      </div>

      <div className="filters">
        <div className="chips" role="group" aria-label="Show">
          {(['all', 'offer', 'request'] as Filter[]).map((f) => (
            <button key={f} type="button" className={`chip ${filter === f ? 'chip--on' : ''}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === 'all' ? 'Everything' : f === 'offer' ? 'Offers' : 'Requests'}
            </button>
          ))}
        </div>
        <label className="select-inline">
          <span>Category</span>
          <select value={category} onChange={(e) => setCategory(Number(e.target.value))}>
            <option value={-1}>All</option>
            {CATEGORIES.map((c, i) => (
              <option key={c} value={i}>
                {c}
              </option>
            ))}
          </select>
        </label>
        {closed.length > 0 && (
          <label className="check-inline">
            <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
            <span>Show closed ({closed.length})</span>
          </label>
        )}
      </div>

      {shown.length === 0 ? (
        <Empty title={data.listings.length === 0 ? 'The board is empty' : 'Nothing matches'}>
          <p>
            {data.listings.length === 0
              ? canAct
                ? 'Start it off: post one thing you could help a neighbour with.'
                : 'Nobody has posted yet.'
              : 'Try another filter.'}
          </p>
        </Empty>
      ) : (
        <ul className="listings">
          {shown.map((l) => (
            <ListingCard key={String(l.id)} listing={l} canAct={canAct} onAction={onAction} />
          ))}
        </ul>
      )}
    </section>
  )
}

function ListingCard({ listing, canAct, onAction }: { listing: Listing; canAct: boolean; onAction: (a: GuyubAction) => void }) {
  const { active } = useWallet()
  const mine = sameAddress(active?.account, listing.poster)
  const offer = listing.kind === 'offer'
  return (
    <li className={`listing listing--${listing.kind} ${listing.open ? '' : 'listing--closed'}`}>
      <div className="listing__top">
        <span className={`tag ${offer ? 'tag--leaf' : 'tag--turmeric'}`}>{offer ? 'Offer · can help' : 'Request · needs help'}</span>
        <span className="tag tag--plain">{CATEGORIES[listing.category] ?? 'Other'}</span>
        {!listing.open && <span className="tag tag--plain">Closed</span>}
      </div>
      <h3 className="listing__title">{listing.title}</h3>
      {listing.detail && <p className="listing__detail">{listing.detail}</p>}
      <p className="listing__meta">
        <Person address={listing.poster} plain /> · {timeAgo(listing.postedAt)}
        {listing.exchanges > 0 && (
          <>
            {' '}
            · <span className="num">{plural(listing.exchanges, 'exchange')}, {hoursShort(listing.unitsLinked)}</span>
          </>
        )}
      </p>
      {listing.open && canAct && (
        <div className="listing__actions">
          {mine ? (
            <button type="button" className="btn btn--quiet btn--small" onClick={() => onAction({ type: 'close', listing })}>
              Close listing
            </button>
          ) : offer ? (
            <button
              type="button"
              className="btn btn--secondary btn--small"
              onClick={() => onAction({ type: 'exchange', mode: 'give', other: listing.poster, listing: listing.id })}
            >
              They helped me · give hours
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--secondary btn--small"
              onClick={() => onAction({ type: 'exchange', mode: 'request', other: listing.poster, listing: listing.id })}
            >
              I helped · request hours
            </button>
          )}
        </div>
      )}
    </li>
  )
}
