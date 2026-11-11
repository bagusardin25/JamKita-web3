import { ArrowRight } from 'lucide-react'
import type { Address } from 'viem'
import { floorUnits, hoursLong } from '../lib/hours'
import { Person, Signed } from './bits'

type Side = { who: Address | 'commons'; before: number; delta: number }

/**
 * Before and after, for both sides of a movement, shown before anything is signed.
 * Flags the payer's side when it would pass the credit limit.
 */
export function BalancePreview({ sides, creditHours }: { sides: Side[]; creditHours: number }) {
  const floor = floorUnits(creditHours)
  return (
    <div className="preview" aria-label="Balances before and after">
      {sides.map((side, i) => {
        const after = side.before + side.delta
        const checksFloor = side.who !== 'commons' && side.delta < 0
        const over = checksFloor && after < floor
        return (
          <div key={i} className={`preview__row ${over ? 'preview__row--over' : ''}`}>
            <span className="preview__who">
              {side.who === 'commons' ? <span className="person person--commons">Commons</span> : <Person address={side.who} plain />}
            </span>
            <span className="preview__nums">
              <Signed units={side.before} />
              <ArrowRight size={16} aria-label="becomes" />
              <Signed units={after} />
            </span>
            {over && (
              <span className="preview__warn">
                Past the credit limit of {hoursLong(floor)} below zero
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
