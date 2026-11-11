// The one place quarter-hour units become text. Every screen formats hours through here,
// so no two screens can round differently.

import { UNITS_PER_HOUR } from '../config/site'

/** U+2212, the real minus sign: it lines up with "+" in tabular figures. */
export const MINUS = '−'

export type Sign = 'plus' | 'minus' | 'zero'

export const signOf = (units: number): Sign => (units > 0 ? 'plus' : units < 0 ? 'minus' : 'zero')

/** 5 → "1 h 15 min", 2 → "30 min", 0 → "0 h". Always unsigned. */
export function hoursLong(units: number): string {
  const abs = Math.abs(units)
  const h = Math.floor(abs / UNITS_PER_HOUR)
  const min = (abs % UNITS_PER_HOUR) * 15
  if (h === 0 && min === 0) return '0 h'
  if (h === 0) return `${min} min`
  if (min === 0) return `${h} h`
  return `${h} h ${min} min`
}

/** 10 → "2.5 h", 5 → "1.25 h", 3 → "0.75 h". Always unsigned. */
export function hoursShort(units: number): string {
  const value = Math.abs(units) / UNITS_PER_HOUR
  return `${Number.isInteger(value) ? value : value.toFixed(2).replace(/0$/, '')} h`
}

const prefix = (units: number) => (units > 0 ? '+' : units < 0 ? MINUS : '')

/** "+1 h 15 min", "−30 min", "0 h". */
export const signedLong = (units: number): string => `${prefix(units)}${hoursLong(units)}`

/** "+2.5 h", "−0.75 h", "0 h". For tables. */
export const signedShort = (units: number): string => `${prefix(units)}${hoursShort(units)}`

/** Words that go with a balance, so its meaning never rests on colour or sign alone. */
export function balanceWords(units: number): string {
  if (units > 0) return 'gave more than received'
  if (units < 0) return 'received more than gave'
  return 'even'
}

/** A full sentence about the connected wallet's own balance. */
export function youWords(units: number): string {
  if (units > 0) return 'You have given more help than you have received.'
  if (units < 0) return 'You have received more help than you have given. That is what the credit limit is for.'
  return 'You are at zero, a clean start.'
}

/** Screen-reader text: "plus 1 hour 15 minutes". */
export function spokenBalance(units: number): string {
  const abs = Math.abs(units)
  const h = Math.floor(abs / UNITS_PER_HOUR)
  const min = (abs % UNITS_PER_HOUR) * 15
  const parts = [h ? `${h} hour${h === 1 ? '' : 's'}` : '', min ? `${min} minutes` : ''].filter(Boolean)
  const amount = parts.length ? parts.join(' ') : 'zero hours'
  return units > 0 ? `plus ${amount}` : units < 0 ? `minus ${amount}` : amount
}

/** The lowest balance a guyub allows, in units (a negative number). */
export const floorUnits = (creditHours: number): number => -creditHours * UNITS_PER_HOUR

/** How many units a member can still pay before reaching the credit limit. */
export const headroomUnits = (balance: number, creditHours: number): number =>
  Math.max(0, balance - floorUnits(creditHours))
