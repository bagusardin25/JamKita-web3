import { UNITS_PER_HOUR } from '../config/site'
import { signedLong, signedShort, spokenBalance } from '../lib/hours'

type Size = 'sm' | 'md' | 'lg'

const GEOMETRY: Record<Size, { box: number; width: number; gap: number }> = {
  sm: { box: 40, width: 5, gap: 5 },
  md: { box: 112, width: 11, gap: 4 },
  lg: { box: 188, width: 16, gap: 3.5 },
}

const SEGMENTS = 12
const STEP = 360 / SEGMENTS

/** Point on a circle, with angles in degrees clockwise from 12 o'clock. */
function point(c: number, r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180
  return [c + r * Math.sin(rad), c - r * Math.cos(rad)]
}

function arc(c: number, r: number, from: number, to: number): string {
  const [x0, y0] = point(c, r, from)
  const [x1, y1] = point(c, r, to)
  const sweep = to > from ? 1 : 0
  const large = Math.abs(to - from) > 180 ? 1 : 0
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} ${sweep} ${x1.toFixed(2)} ${y1.toFixed(2)}`
}

type Props = {
  /** Balance in quarter-hour units. */
  units: number
  /** The guyub's credit limit; draws a notch where the balance cannot go past. */
  creditHours?: number
  size?: Size
  /** Text under the number in the middle (md and lg only). */
  caption?: string
  className?: string
}

/**
 * The Jamkita balance ring. One segment is one hour.
 * Plus fills clockwise in leaf green, minus fills counter-clockwise in turmeric, and the
 * number in the middle always carries its sign, so the meaning never rests on colour alone.
 * Hours 13–24 continue on a thinner inner lap.
 */
export function ClockRing({ units, creditHours, size = 'md', caption, className }: Props) {
  const { box, width, gap } = GEOMETRY[size]
  const c = box / 2
  const outer = c - width / 2 - 1
  const innerWidth = Math.max(3, Math.round(width * 0.55))
  const inner = outer - width / 2 - innerWidth / 2 - (size === 'sm' ? 1.5 : 3)
  const hours = Math.abs(units) / UNITS_PER_HOUR
  const dir = units < 0 ? -1 : 1
  const tone = units < 0 ? 'minus' : 'plus'
  const needsInner = hours > SEGMENTS || (creditHours ?? 0) > SEGMENTS

  const laps = [
    { r: outer, w: width, offset: 0 },
    ...(needsInner ? [{ r: inner, w: innerWidth, offset: SEGMENTS }] : []),
  ]

  const tracks: string[] = []
  const fills: string[] = []
  for (const lap of laps) {
    for (let i = 0; i < SEGMENTS; i++) {
      const start = i * STEP + gap / 2
      const end = (i + 1) * STEP - gap / 2
      tracks.push(arc(c, lap.r, start, end) + `|${lap.w}`)
      const fill = Math.min(1, Math.max(0, hours - (lap.offset + i)))
      if (fill > 0) {
        const to = start + (end - start) * fill
        fills.push(arc(c, lap.r, dir * start, dir * to) + `|${lap.w}`)
      }
    }
  }

  // The credit limit: a notch on the minus side.
  let notch: [number, number, number, number] | undefined
  if (creditHours && creditHours <= SEGMENTS * 2) {
    const onInner = creditHours > SEGMENTS
    const r = onInner ? inner : outer
    const w = onInner ? innerWidth : width
    const deg = -(creditHours - (onInner ? SEGMENTS : 0)) * STEP
    const [x0, y0] = point(c, r - w / 2 - 2, deg)
    const [x1, y1] = point(c, r + w / 2 + 2, deg)
    notch = [x0, y0, x1, y1]
  }

  const label = `Balance ${spokenBalance(units)}${creditHours ? `, credit limit minus ${creditHours} hours` : ''}`

  return (
    <div className={`ring ring--${size} ring--${tone} ${className ?? ''}`} role="img" aria-label={label}>
      <svg viewBox={`0 0 ${box} ${box}`} width={box} height={box} aria-hidden="true" focusable="false">
        {tracks.map((t, i) => {
          const [d, w] = t.split('|')
          return <path key={`t${i}`} d={d} className="ring__track" strokeWidth={w} />
        })}
        {fills.map((f, i) => {
          const [d, w] = f.split('|')
          return <path key={`f${i}`} d={d} className="ring__fill" strokeWidth={w} />
        })}
        {notch && (
          <line x1={notch[0]} y1={notch[1]} x2={notch[2]} y2={notch[3]} className="ring__notch" strokeWidth={size === 'sm' ? 1.5 : 2.5} />
        )}
        {size !== 'sm' && (
          // Twelve o'clock: where every balance starts filling from.
          <line x1={c} y1={c - outer - width / 2} x2={c} y2={c - outer + width / 2 + 3} className="ring__noon" strokeWidth={1.5} />
        )}
      </svg>
      {size !== 'sm' && (
        <div className="ring__center">
          <span className="ring__value num">{size === 'lg' ? signedLong(units) : signedShort(units)}</span>
          {caption && <span className="ring__caption">{caption}</span>}
        </div>
      )}
    </div>
  )
}
