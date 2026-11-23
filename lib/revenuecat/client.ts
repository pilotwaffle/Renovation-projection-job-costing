// CLIENT-ONLY; do not import into a server component.
//
// This wrapper is the paywall purchase path. It stays client-only and still
// performs no server entitlement writes.
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
// - `Purchases.configure` runs once per session and only with a real id.
//   A missing, empty, or `$RCAnonymousID` id does not configure. A later
//   different real id calls `logIn`. A no-id call after a real configure
//   reuses that session.
// - Purchase and restore refuse an anonymous RevenueCat user.

import { Capacitor } from '@capacitor/core'
// Type-only import — erased at build time, so it never pulls the native
// module into the bundle or SSR. Used only to type the wrapper below.
import type {
  PurchasesOfferings,
  PurchasesPackage,
  PurchasesPlugin,
  PurchasesStoreProduct,
} from '@revenuecat/purchases-capacitor'

export const PRO_MONTHLY_PRODUCT_ID = 'com.torq.renomargin.pro.monthly'

export interface RcIntroOffer {
  price: number
  priceString: string
  period: string
  periodUnit: string
  periodNumberOfUnits: number
  cycles: number
}

export interface RcProMonthlyProduct {
  productId: string
  priceString: string
  subscriptionPeriod: string | null
  intro: RcIntroOffer | null
}

export type RcPurchaseResult =
  | {
      available: true
      cancelled: false
      productId: string
      entitlements: RcEntitlementSummary
    }
  | { available: true; cancelled: true }
  | { available: true; pending: true }
  | { available: false; reason: RcUnavailableReason; message?: string }

export type RcUnavailableReason =
  | 'not-native'
  | 'missing-key'
  | 'not-configured'
  | 'not-signed-in'
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

let configurePromise: Promise<RcResult<{ appUserId?: string }>> | null = null
let configuredUserId: string | null = null

/** Test-only. Drops the configure memo so the next init can configure again. */
export function __resetRevenueCatForTests(): void {
  configurePromise = null
  configuredUserId = null
}

function realUserId(id: string | null | undefined): string | null {
  if (id == null || id === '' || id.startsWith('$RCAnonymousID')) return null
  return id
}

function isAnonymousId(id: string | null | undefined): boolean {
  return realUserId(id) === null
}

/**
 * Dynamically loads the RevenueCat Capacitor plugin. Only ever call this
 * after confirming `Capacitor.isNativePlatform()` is true — importing the
 * module itself is safe on web too, but there is no reason to pay the cost
 * or attempt any native bridge call on web.
 *
 * IMPORTANT: this returns a plain WRAPPER object `{ Purchases }`, never the
 * Capacitor `Purchases` plugin proxy directly. Returning the proxy from an
 * `async` function (or resolving a Promise with it) makes the JS runtime
 * treat the proxy as a thenable and probe it for a `.then` method while
 * unwrapping the awaited value. On iOS that `.then` call is routed through
 * the Capacitor bridge to a native method that does not exist, producing the
 * "then() is not implemented on ios" error and hanging the await. Wrapping the
 * proxy in a plain object means the awaited value is an ordinary object with
 * no `then`, so the runtime never touches the bridge during unwrapping.
 */
async function loadPurchases(): Promise<{ Purchases: PurchasesPlugin }> {
  const mod = await import('@revenuecat/purchases-capacitor')
  return { Purchases: mod.Purchases }
}

/**
 * Configures the RevenueCat SDK. Must be called client-side, after mount
 * (e.g. from a useEffect or a button handler) — never at module import time
 * — so the Capacitor bridge has a chance to be ready.
 *
 * Configure runs once per session and only with a real app user id. A
 * missing, empty, or `$RCAnonymousID` id does not configure: when nothing
 * is configured yet that call returns `not-signed-in`. A later different
 * real id calls `logIn`. A no-id call after a real configure reuses it.
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

  const nextId = realUserId(appUserId)

  // Assign before the first await so two callers share one configure.
  let session = configurePromise
  if (session === null) {
    if (nextId === null) {
      return { available: false, reason: 'not-signed-in' }
    }
    session = configureOnce(apiKey, nextId)
    configurePromise = session
  }

  const configured = await session
  if (!configured.available) return configured

  if (nextId && nextId !== configuredUserId) {
    const loggedIn = await rcLogIn(nextId)
    if (!loggedIn.available) {
      return { available: false, reason: loggedIn.reason, message: loggedIn.message }
    }
  }

  return { available: true, appUserId: configuredUserId ?? undefined }
}

async function configureOnce(
  apiKey: string,
  appUserId: string
): Promise<RcResult<{ appUserId?: string }>> {
  const storedId = realUserId(appUserId)
  if (storedId === null) {
    configurePromise = null
    configuredUserId = null
    return { available: false, reason: 'not-signed-in' }
  }

  try {
    const { Purchases } = await loadPurchases()
    await Purchases.configure({
      apiKey,
      appUserID: storedId,
    })
    configuredUserId = storedId
    return { available: true, appUserId: storedId }
  } catch (err) {
    configurePromise = null
    configuredUserId = null
    logPaywall('configure failed', err)
    return {
      available: false,
      reason: 'error',
      message: errorMessage(err),
    }
  }
}

/**
 * Logs in (or identifies) the current app user with RevenueCat, typically
 * using the Supabase auth uid. An empty or anonymous id returns
 * `not-signed-in` and does not call `Purchases.logIn`.
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

  const nextId = realUserId(appUserId)
  if (nextId === null) {
    return { available: false, reason: 'not-signed-in' }
  }

  try {
    const { Purchases } = await loadPurchases()
    const result = await Purchases.logIn({ appUserID: nextId })
    configuredUserId = nextId
    return {
      available: true,
      created: result.created,
      entitlements: summarizeEntitlements(result.customerInfo),
    }
  } catch (err) {
    logPaywall('logIn failed', err)
    return {
      available: false,
      reason: 'error',
      message: errorMessage(err),
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
    const { Purchases } = await loadPurchases()
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
    const { Purchases } = await loadPurchases()
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
 * Refuses an anonymous RevenueCat user so a restore cannot credit one.
 */
export async function restorePurchases(): Promise<RcResult<{ entitlements: RcEntitlementSummary }>> {
  const refused = await requireIdentifiedUser()
  if (refused) return refused

  try {
    const { Purchases } = await loadPurchases()
    const { appUserID } = await Purchases.getAppUserID()
    if (isAnonymousId(appUserID)) {
      return { available: false, reason: 'not-signed-in' }
    }
    const { customerInfo } = await Purchases.restorePurchases()
    return { available: true, entitlements: summarizeEntitlements(customerInfo) }
  } catch (err) {
    logPaywall('restore failed', err)
    return {
      available: false,
      reason: 'error',
      message: errorMessage(err),
    }
  }
}

/**
 * Purchase and restore only. Returns a refusal, or null when the stored user
 * id is a real id and RevenueCat is configured for that id.
 */
async function requireIdentifiedUser(): Promise<
  { available: false; reason: RcUnavailableReason; message?: string } | null
> {
  if (!Capacitor.isNativePlatform()) {
    return { available: false, reason: 'not-native' }
  }

  const apiKey = getPublicKey()
  if (!apiKey) {
    return { available: false, reason: 'missing-key' }
  }

  const userId = configuredUserId
  if (userId == null || isAnonymousId(userId)) {
    return { available: false, reason: 'not-signed-in' }
  }

  const init = await initRevenueCat(userId)
  if (!init.available) return init
  return null
}

function errorMessage(err: unknown): string {
  if (typeof err === 'string' && err) return err
  if (err && typeof err === 'object' && 'message' in err) {
    const message = (err as { message: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  if (err instanceof Error && err.message) return err.message
  return 'Something went wrong.'
}

/** One tagged line. Never logs the key, a user id, or the raw error object. */
function logPaywall(event: string, err: unknown): void {
  let text = errorMessage(err)
  const apiKey = getPublicKey()
  if (apiKey) {
    text = text.split(apiKey).join('[redacted]')
  }
  text = text.replace(/\$RCAnonymousID:\S+/g, '[redacted]')
  console.error(`[paywall] ${event}: ${text}`)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'object' && value !== null) {
    return value as Record<string, unknown>
  }
  return null
}

/**
 * StoreKit cancellation, including Capacitor's `call.reject(message, code, data)`
 * shape: RevenueCat's code lands on `error.code` (string `"1"`) and the
 * container on `error.data`. Checked in the order the paywall depends on.
 */
function isPurchaseCancelled(err: unknown): boolean {
  const record = asRecord(err)
  if (!record) {
    return typeof err === 'string' && /purchase was cancelled/i.test(err)
  }

  const data = asRecord(record.data)
  if (record.userCancelled === true || data?.userCancelled === true) {
    return true
  }

  const code = record.code ?? data?.code
  if (code !== undefined && code !== null && String(code) === '1') {
    return true
  }

  const readable =
    record.readableErrorCode ??
    record.readable_error_code ??
    data?.readableErrorCode ??
    data?.readable_error_code
  if (readable === 'PURCHASE_CANCELLED_ERROR') {
    return true
  }

  const message = typeof record.message === 'string' ? record.message : ''
  return /purchase was cancelled/i.test(message)
}

function isAlreadyPurchased(err: unknown): boolean {
  const record = asRecord(err)
  if (!record) return false
  const data = asRecord(record.data)
  const code = record.code ?? data?.code
  if (code !== undefined && code !== null && String(code) === '6') {
    return true
  }
  const readable =
    record.readableErrorCode ??
    record.readable_error_code ??
    data?.readableErrorCode ??
    data?.readable_error_code
  return readable === 'PRODUCT_ALREADY_PURCHASED_ERROR'
}

/** Ask to Buy and other StoreKit pending payments. Code "20" / PAYMENT_PENDING_ERROR. */
function isPaymentPending(err: unknown): boolean {
  const record = asRecord(err)
  if (!record) return false
  const data = asRecord(record.data)
  const code = record.code ?? data?.code
  if (code !== undefined && code !== null && String(code) === '20') {
    return true
  }
  const readable =
    record.readableErrorCode ??
    record.readable_error_code ??
    data?.readableErrorCode ??
    data?.readable_error_code
  return readable === 'PAYMENT_PENDING_ERROR'
}

function mapIntro(intro: PurchasesStoreProduct['introPrice']): RcIntroOffer | null {
  if (!intro) return null
  return {
    price: intro.price,
    priceString: intro.priceString,
    period: intro.period,
    periodUnit: intro.periodUnit,
    periodNumberOfUnits: intro.periodNumberOfUnits,
    cycles: intro.cycles,
  }
}

function mapStoreProduct(product: PurchasesStoreProduct): RcProMonthlyProduct {
  return {
    productId: product.identifier,
    priceString: product.priceString,
    subscriptionPeriod: product.subscriptionPeriod ?? null,
    intro: mapIntro(product.introPrice),
  }
}

function findPackage(
  offerings: PurchasesOfferings,
  productId: string
): PurchasesPackage | null {
  const packages = offerings.current?.availablePackages ?? []
  for (const pkg of packages) {
    if (pkg.product.identifier === productId) return pkg
  }
  return null
}

/**
 * Loads the monthly Pro product as plain data. Prefers the current offering
 * package, then `getProducts`. Never returns the native package object.
 * Uses the configured real user id, or returns `not-signed-in` when nothing
 * is configured.
 */
export async function loadProMonthlyProduct(): Promise<
  RcResult<{ product: RcProMonthlyProduct }>
> {
  if (!Capacitor.isNativePlatform()) {
    return { available: false, reason: 'not-native' }
  }

  const apiKey = getPublicKey()
  if (!apiKey) {
    return { available: false, reason: 'missing-key' }
  }

  if (configuredUserId == null) {
    return { available: false, reason: 'not-signed-in' }
  }

  const init = await initRevenueCat(configuredUserId)
  if (!init.available) return init

  try {
    const { Purchases } = await loadPurchases()
    let product: RcProMonthlyProduct | null = null

    try {
      const offerings = await Purchases.getOfferings()
      const pkg = findPackage(offerings, PRO_MONTHLY_PRODUCT_ID)
      if (pkg) product = mapStoreProduct(pkg.product)
    } catch {
      product = null
    }

    if (!product) {
      const { products } = await Purchases.getProducts({
        productIdentifiers: [PRO_MONTHLY_PRODUCT_ID],
      })
      const storeProduct =
        products.find((item) => item.identifier === PRO_MONTHLY_PRODUCT_ID) ?? null
      if (storeProduct) product = mapStoreProduct(storeProduct)
    }

    if (!product) {
      return { available: false, reason: 'no-offerings' }
    }

    return { available: true, product }
  } catch (err) {
    logPaywall('load failed', err)
    return {
      available: false,
      reason: 'error',
      message: errorMessage(err),
    }
  }
}

/**
 * Purchases RenoMargin Pro monthly. The paywall configures RevenueCat with
 * the Supabase user id before calling this. Refuses an anonymous app user.
 * Never throws.
 */
export async function purchaseProMonthly(
  productId: string = PRO_MONTHLY_PRODUCT_ID
): Promise<RcPurchaseResult> {
  const refused = await requireIdentifiedUser()
  if (refused) return refused

  try {
    const { Purchases } = await loadPurchases()
    const { appUserID } = await Purchases.getAppUserID()
    if (isAnonymousId(appUserID)) {
      return { available: false, reason: 'not-signed-in' }
    }

    let matched: PurchasesPackage | null = null
    try {
      const offerings = await Purchases.getOfferings()
      matched = findPackage(offerings, productId)
    } catch {
      matched = null
    }

    let customerInfo: Parameters<typeof summarizeEntitlements>[0]
    if (matched) {
      const purchased = await Purchases.purchasePackage({ aPackage: matched })
      customerInfo = purchased.customerInfo
    } else {
      const { products } = await Purchases.getProducts({
        productIdentifiers: [productId],
      })
      const product =
        products.find((item) => item.identifier === productId) ?? null
      if (!product) {
        return { available: false, reason: 'no-offerings' }
      }
      const purchased = await Purchases.purchaseStoreProduct({ product })
      customerInfo = purchased.customerInfo
    }

    return {
      available: true,
      cancelled: false,
      productId,
      entitlements: summarizeEntitlements(customerInfo),
    }
  } catch (err) {
    if (isPurchaseCancelled(err)) {
      return { available: true, cancelled: true }
    }

    if (isPaymentPending(err)) {
      return { available: true, pending: true }
    }

    if (isAlreadyPurchased(err)) {
      try {
        const info = await getCustomerInfo()
        if (info.available && info.entitlements.proActive) {
          return {
            available: true,
            cancelled: false,
            productId,
            entitlements: info.entitlements,
          }
        }
      } catch {
        // getCustomerInfo already never throws; keep the error result below.
      }
    }

    logPaywall('purchase failed', err)
    return {
      available: false,
      reason: 'error',
      message: errorMessage(err),
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
