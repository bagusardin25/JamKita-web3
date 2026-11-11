const encoder = new TextEncoder()

/** The contract limits text by UTF-8 bytes, not characters. */
export const byteLength = (text: string): number => encoder.encode(text).length

/** Single-line text: collapse line breaks and repeated spaces. */
export const cleanLine = (text: string): string => text.replace(/\s+/g, ' ').trim()

export const shortAddress = (address: string): string => `${address.slice(0, 6)}…${address.slice(-4)}`

export const sameAddress = (a?: string, b?: string): boolean => !!a && !!b && a.toLowerCase() === b.toLowerCase()

export const plural = (count: number, one: string, many = `${one}s`): string => `${count} ${count === 1 ? one : many}`

const DAY = 86_400

export function timeAgo(timestamp: number, nowMs = Date.now()): string {
  const seconds = Math.max(0, Math.floor(nowMs / 1000) - timestamp)
  if (seconds < 45) return 'just now'
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} min ago`
  if (seconds < DAY) return `${Math.round(seconds / 3600)} h ago`
  if (seconds < DAY * 14) return plural(Math.round(seconds / DAY), 'day') + ' ago'
  return formatDate(timestamp)
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
