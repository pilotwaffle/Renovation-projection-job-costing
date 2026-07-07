// CLIENT-ONLY; do not import into a server component.
//
// This is a SPIKE harness, not the production subscription implementation.
// It exists to prove (or disprove) that the RevenueCat Capacitor SDK can be
// configured and queried from the live-server webview on a real device.
//
// Safety rules baked into this file:
// - The native `@revenuecat/purchases-capacitor` module is NEVER imported at
//   module top-level. Every function below does a dynamic `await import(...)`
//   *inside* the function body, gated behind `Capacitor.isNativePlatform()`.
//   This means importing this file can never throw during `next build`,
//   during SSR, or in a plain desktop/mobile browser tab.
// - No function ever throws to the caller. Every function catches internally
//   and returns a typed `{ available: false, reason: ... }` or `{ error }`
//   shape instead.
// - Only the PUBLIC SDK key (`NEXT_PUBLIC_REVENUECAT_IOS_KEY`) is read here.
//   No secret/REST API key is referenced anywhere in this file.

import { Capacitor } from '@capacitor/core'

export type RcUnavailableReason =
  | 'not-native'
  | 'missing-key'
  | 'not-configured'
  | 'no-offerings'
  | 'error'

export type RcResult<T> =
  | ({ available: true } & T)
  | { available: false; reason: RcUnavailableReason; message?: string }

export interface RcEntitlementSummary {
  proActive: boolean
  activeEntitlements: string[]
  allEntitlements: string[]
}

export interface RcOfferingSummary {
  offeringId: string
  packages: Array<{
    packageId: string
    productId: string
    priceString: string
    hasIntroOffer: boolean
    introPeriod: string | null
  }>
}

function getPublicKey(): string | undefined {
  return process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY
}

/**
 * Dynamically loads the RevenueCat Capacitor plugin. Only ever call this
 * after confirming `Capacitor.isNativePlatform()` is true — importing the
 * module itself is safe on web too, but there is no reason to pay the cost
 * or attempt any native bridge call on web.
 */
async function loadPurchases() {
  const mod = await import('@revenuecat/purchases-capacitor')
  return mod.Purchases
}

/**
 * Configures the RevenueCat SDK. Must be called client-side, after mount
 * (e.g. from a useEffect or a button handler) — never at module import time
 * — so the Capacitor bridge has a chance to be ready.
 */
export async function initRevenueCat(
  appUserId?: string
): Promise<RcResult<{ appUserId?: string }>> {
  if (!Capacitor.isNativePlatform()) {
    return { available: false, reason: 'not-native' }
  }

  const apiKey = getPublicKey()
  if (!apiKey) {
    return { available: false, reason: 'missing-key' }
  }

  try {
    const Purchases = await loadPurchases()
    await Purchases.configure({
      apiKey,
      appUserID: appUserId ?? null,
    })
    return { available: true, appUserId }
  } catch (err) {
    return {
      available: false,
      reason: 'error',
      message: err instanceof Error ? err.message : String(err),
    }
  }
}

/**
 * Logs in (or identifies) the current app user with RevenueCat, typically
 * using the Supabase auth uid so RevenueCat can merge anonymous -> identified.
 */
export async function rcLogIn(
  appUserId: string
): Promise<RcResult<{ created: boolean; entitlements: RcEntitlementSummary }>> {
  if (!Capacitor.isNativePlatform()) {
    return { available: false, reason: 'not-native' }
  }

  const apiKey = getPublicKey()
  if (!apiKey) {
    return { available: false, reason: 'missing-key' }
  }

  try {
    const Purchases = await loadPurchases()
    const result = await Purchases.logIn({ appUserID: appUserId })
    return {
      available: true,
      created: result.created,
      entitlements: summarizeEntitlements(result.customerInfo),
    }
  } catch (err) {
    return {
      available: false,
      reason: 'error',
      message: err instanceof Error ? err.message : String(err),
    }
  }
}

function summarizeEntitlements(customerInfo: {
  entitlements: { active: Record<string, unknown>; all: Record<string, unknown> }
}): RcEntitlementSummary {
  const activeEntitlements = Object.keys(customerInfo.entitlements.active)
  const allEntitlements = Object.keys(customerInfo.entitlements.all)
  return {
    proActive: activeEntitlements.includes('pro'),
    activeEntitlements,
    allEntitlements,
  }
}

/**
 * Fetches CustomerInfo and summarizes entitlement state (esp. 'pro').
 */
export async function getCustomerInfo(): Promise<RcResult<{ entitlements: RcEntitlementSummary }>> {
  if (!Capacitor.isNativePlatform()) {
    return { available: false, reason: 'not-native' }
  }

  const apiKey = getPublicKey()
  if (!apiKey) {
    return { available: false, reason: 'missing-key' }
  }

  try {
    const Purchases = await loadPurchases()
    const { customerInfo } = await Purchases.getCustomerInfo()
    return { available: true, entitlements: summarizeEntitlements(customerInfo) }
  } catch (err) {
    return {
      available: false,
      reason: 'error',
      message: err instanceof Error ? err.message : String(err),
    }
  }
}

/**
 * Fetches offerings/packages/products. If the SDK initializes successfully
 * but no offering/products are configured yet in the RevenueCat dashboard,
 * this surfaces `reason: 'no-offerings'` distinctly from a hard error, so
 * the spike can report "SDK initializes but offerings unavailable".
 */
export async function getOfferings(): Promise<RcResult<{ current: RcOfferingSummary | null }>> {
  if (!Capacitor.isNativePlatform()) {
    return { available: false, reason: 'not-native' }
  }

  const apiKey = getPublicKey()
  if (!apiKey) {
    return { available: false, reason: 'missing-key' }
  }

  try {
    const Purchases = await loadPurchases()
    const offerings = await Purchases.getOfferings()

    if (!offerings.current || offerings.current.availablePackages.length === 0) {
      return { available: false, reason: 'no-offerings' }
    }

    const current = offerings.current
    return {
      available: true,
      current: {
        offeringId: current.identifier,
        packages: current.availablePackages.map((pkg) => ({
          packageId: pkg.identifier,
          productId: pkg.product.identifier,
          priceString: pkg.product.priceString,
          hasIntroOffer: pkg.product.introPrice !== null,
          introPeriod: pkg.product.introPrice?.period ?? null,
        })),
      },
    }
  } catch (err) {
    return {
      available: false,
      reason: 'error',
      message: err instanceof Error ? err.message : String(err),
    }
  }
}

/**
 * Restores previous purchases for the current device/user.
 */
export async function restorePurchases(): Promise<RcResult<{ entitlements: RcEntitlementSummary }>> {
  if (!Capacitor.isNativePlatform()) {
    return { available: false, reason: 'not-native' }
  }

  const apiKey = getPublicKey()
  if (!apiKey) {
    return { available: false, reason: 'missing-key' }
  }

  try {
    const Purchases = await loadPurchases()
    const { customerInfo } = await Purchases.restorePurchases()
    return { available: true, entitlements: summarizeEntitlements(customerInfo) }
  } catch (err) {
    return {
      available: false,
      reason: 'error',
      message: err instanceof Error ? err.message : String(err),
    }
  }
}

/**
 * Synchronous helpers for the diagnostics UI — safe to call anywhere,
 * never touch the native module.
 */
export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

export function hasPublicKey(): boolean {
  return Boolean(getPublicKey())
}
