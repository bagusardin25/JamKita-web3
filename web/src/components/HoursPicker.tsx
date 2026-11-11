import { Minus, Plus } from 'lucide-react'
import { LIMITS } from '../config/site'
import { hoursLong } from '../lib/hours'

const QUICK = [2, 4, 6, 8] // 30 min, 1 h, 1.5 h, 2 h

/**
 * Picks an amount in quarter hours, 15 minutes to 8 hours.
 * A stepper rather than a free number field, so nobody types 80 when they meant 8.
 */
export function HoursPicker({
  id,
  units,
  onChange,
  max = LIMITS.unitsMax,
  label = 'How long',
}: {
  id: string
  units: number
  onChange: (units: number) => void
  max?: number
  label?: string
}) {
  const top = Math.min(max, LIMITS.unitsMax)
  const set = (next: number) => onChange(Math.max(LIMITS.unitsMin, Math.min(LIMITS.unitsMax, next)))
  return (
    <fieldset className="hours-picker">
      <legend className="field__label">{label}</legend>
      <div className="hours-picker__row">
        <button
          type="button"
          className="hours-picker__step"
          onClick={() => set(units - 1)}
          disabled={units <= LIMITS.unitsMin}
          aria-label="15 minutes less"
        >
          <Minus size={18} aria-hidden="true" />
        </button>
        <output id={id} className="hours-picker__value num" aria-live="polite">
          {hoursLong(units)}
        </output>
        <button
          type="button"
          className="hours-picker__step"
          onClick={() => set(units + 1)}
          disabled={units >= LIMITS.unitsMax}
          aria-label="15 minutes more"
        >
          <Plus size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="hours-picker__quick" role="group" aria-label="Common amounts">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            className={`chip ${units === q ? 'chip--on' : ''}`}
            aria-pressed={units === q}
            onClick={() => set(q)}
          >
            {hoursLong(q)}
          </button>
        ))}
      </div>
      {top < LIMITS.unitsMax && (
        <p className="field__hint">
          {top > 0 ? `Most you can pay right now: ${hoursLong(top)}.` : 'You cannot pay anything right now.'}
        </p>
      )}
    </fieldset>
  )
}
