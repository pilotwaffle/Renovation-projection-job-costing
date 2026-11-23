/**
 * Paywall copy built only from StoreKit fields. No prices and no trial
 * lengths are written here — those arrive at runtime.
 */

export interface SubscriptionLength {
  lengthLabel: string
  perLabel: string
}

export interface IntroOfferCopy {
  price: number
  priceString: string
  period: string
  periodUnit: string
  periodNumberOfUnits: number
  cycles: number
}

const UNIT_WORDS: Record<string, [singular: string, plural: string]> = {
  D: ['day', 'days'],
  W: ['week', 'weeks'],
  M: ['month', 'months'],
  Y: ['year', 'years'],
  DAY: ['day', 'days'],
  WEEK: ['week', 'weeks'],
  MONTH: ['month', 'months'],
  YEAR: ['year', 'years'],
}

/** Plan length for this SKU when StoreKit omits subscriptionPeriod. Not a price. */
const MONTHLY_LENGTH: SubscriptionLength = {
  lengthLabel: '1 month',
  perLabel: 'per month',
}

function wordsFor(unit: string): [string, string] | null {
  return UNIT_WORDS[unit.toUpperCase()] ?? null
}

function lengthFromUnit(count: number, unit: string): SubscriptionLength | null {
  const words = wordsFor(unit)
  if (!words || !Number.isFinite(count) || count < 1) return null
  const word = count === 1 ? words[0] : words[1]
  return {
    lengthLabel: `${count} ${word}`,
    perLabel: count === 1 ? `per ${word}` : `per ${count} ${word}`,
  }
}

/** ISO 8601 period: P(\d+)([DWMY]). One unit is singular; many units include the count. */
export function formatIsoPeriod(period: string | null | undefined): SubscriptionLength | null {
  if (!period) return null
  const match = /^P(\d+)([DWMY])$/i.exec(period.trim())
  if (!match) return null
  return lengthFromUnit(Number(match[1]), match[2])
}

export function formatSubscriptionLength(
  subscriptionPeriod: string | null | undefined
): SubscriptionLength {
  return formatIsoPeriod(subscriptionPeriod) ?? MONTHLY_LENGTH
}

export function formatIntroLength(
  intro: Pick<IntroOfferCopy, 'period' | 'periodUnit' | 'periodNumberOfUnits'>
): string | null {
  const fromUnit = lengthFromUnit(intro.periodNumberOfUnits, intro.periodUnit)
  if (fromUnit) return fromUnit.lengthLabel
  return formatIsoPeriod(intro.period)?.lengthLabel ?? null
}

export function formatPriceLine(priceString: string, perLabel: string): string {
  return `${priceString} ${perLabel}`
}

export function formatDisclosure(
  priceString: string,
  lengthLabel: string,
  perLabel: string
): string {
  return `RenoMargin Pro is an auto-renewing monthly subscription. The subscription length is ${lengthLabel} at ${priceString} ${perLabel}. It renews unless cancelled at least 24 hours before the end of the current period. Payment is charged to your Apple ID account at confirmation of purchase. Your account will be charged ${priceString} for renewal within 24 hours before the current period ends. Manage or cancel your subscription in your App Store account settings.`
}

export function formatIntroCopy(intro: IntroOfferCopy): string | null {
  const length = formatIntroLength(intro)
  if (!length) return null
  if (intro.price === 0) {
    return `Free trial: ${length}. Any unused portion of a free trial, if offered, is forfeited when you purchase this subscription.`
  }
  if (intro.price > 0) {
    const periodWord = intro.cycles === 1 ? 'period' : 'periods'
    return `Introductory offer: ${intro.priceString} for ${length} (${intro.cycles} billing ${periodWord}).`
  }
  return null
}
