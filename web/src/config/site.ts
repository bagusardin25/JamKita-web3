export const SITE = {
  name: 'Jamkita',
  tagline: 'A time bank for neighbours',
  /** The project's X profile. Leave empty until the account exists; the footer hides the link. */
  xUrl: '',
  botchainUrl: 'https://botchain.ai',
  botchainScanUrl: 'https://scan.botchain.ai',
} as const

/** Listing categories, in contract order. */
export const CATEGORIES = [
  'Teaching',
  'Repairs',
  'Errands',
  'Care',
  'Tech',
  'Creative',
  'Food',
  'Transport',
  'Other',
] as const

/** Byte limits enforced by the contract (UTF-8 bytes, not characters). */
export const LIMITS = {
  nameMin: 3,
  nameMax: 48,
  about: 200,
  titleMin: 3,
  titleMax: 64,
  detail: 200,
  memo: 140,
  profileName: 32,
  profileAbout: 140,
  contact: 48,
  creditMin: 2,
  creditMax: 20,
  creditDefault: 5,
  /** One payment, request, donation or grant: 1–32 quarter hours (15 min to 8 h). */
  unitsMin: 1,
  unitsMax: 32,
} as const

export const UNITS_PER_HOUR = 4
