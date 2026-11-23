import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const {
  isNativePlatform,
  configure,
  getOfferings,
  getProducts,
  purchasePackage,
  purchaseStoreProduct,
  getCustomerInfo,
  getAppUserID,
  logIn,
  pluginRestore,
  purchasesPlugin,
} = vi.hoisted(() => {
  const configure = vi.fn()
  const getOfferings = vi.fn()
  const getProducts = vi.fn()
  const purchasePackage = vi.fn()
  const purchaseStoreProduct = vi.fn()
  const getCustomerInfo = vi.fn()
  const getAppUserID = vi.fn()
  const logIn = vi.fn()
  const pluginRestore = vi.fn()
  // Plain object. A thenable here makes Capacitor probe `.then` on iOS.
  const purchasesPlugin = {
    configure,
    getOfferings,
    getProducts,
    purchasePackage,
    purchaseStoreProduct,
    getCustomerInfo,
    getAppUserID,
    logIn,
    restorePurchases: pluginRestore,
  }
  return {
    isNativePlatform: vi.fn(() => true),
    configure,
    getOfferings,
    getProducts,
    purchasePackage,
    purchaseStoreProduct,
    getCustomerInfo,
    getAppUserID,
    logIn,
    pluginRestore,
    purchasesPlugin,
  }
})

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform,
  },
}))

vi.mock('@revenuecat/purchases-capacitor', () => ({
  Purchases: purchasesPlugin,
}))

import {
  __resetRevenueCatForTests,
  initRevenueCat,
  loadProMonthlyProduct,
  purchaseProMonthly,
  rcLogIn,
  restorePurchases,
} from '@/lib/revenuecat/client'

const PRO_ID = 'com.torq.renomargin.pro.monthly'

const customerInfo = {
  entitlements: {
    active: { pro: {} },
    all: { pro: {} },
  },
}

function monthlyPackage() {
  return {
    identifier: '$rc_monthly',
    packageType: 'MONTHLY',
    product: {
      identifier: PRO_ID,
      priceString: '$19.99',
      subscriptionPeriod: 'P1M',
      introPrice: null,
    },
    presentedOfferingContext: {
      offeringIdentifier: 'default',
      placementIdentifier: null,
      targetingContext: null,
    },
  }
}

beforeEach(() => {
  __resetRevenueCatForTests()
  vi.clearAllMocks()
  vi.stubEnv('NEXT_PUBLIC_REVENUECAT_IOS_KEY', 'appl_test')
  isNativePlatform.mockReturnValue(true)
  configure.mockReset()
  configure.mockResolvedValue(undefined)
  getOfferings.mockResolvedValue({ current: null, all: {} })
  getProducts.mockResolvedValue({ products: [] })
  purchasePackage.mockResolvedValue({
    productIdentifier: PRO_ID,
    customerInfo: { entitlements: { active: {}, all: {} } },
    transaction: {},
  })
  purchaseStoreProduct.mockResolvedValue({
    productIdentifier: PRO_ID,
    customerInfo: { entitlements: { active: {}, all: {} } },
    transaction: {},
  })
  getCustomerInfo.mockResolvedValue({
    customerInfo: { entitlements: { active: {}, all: {} } },
  })
  getAppUserID.mockResolvedValue({ appUserID: 'user-1' })
  logIn.mockResolvedValue({
    created: false,
    customerInfo: { entitlements: { active: {}, all: {} } },
  })
  pluginRestore.mockResolvedValue({
    customerInfo: { entitlements: { active: {}, all: {} } },
  })
})

async function asUser(id = 'user-1') {
  const result = await initRevenueCat(id)
  expect(result.available).toBe(true)
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('purchaseProMonthly', () => {
  it('purchases the current offering package and reports the pro entitlement', async () => {
    await asUser()
    const pkg = monthlyPackage()
    getOfferings.mockResolvedValue({
      current: { availablePackages: [pkg] },
      all: {},
    })
    purchasePackage.mockResolvedValue({
      productIdentifier: PRO_ID,
      customerInfo,
      transaction: {},
    })

    const result = await purchaseProMonthly()

    expect(purchasePackage).toHaveBeenCalledWith({ aPackage: pkg })
    expect(purchaseStoreProduct).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      available: true,
      cancelled: false,
      productId: PRO_ID,
      entitlements: { proActive: true },
    })
  })

  it('falls back to purchaseStoreProduct when the offering has a different product', async () => {
    await asUser()
    const storeProduct = {
      identifier: PRO_ID,
      priceString: '$19.99',
      subscriptionPeriod: 'P1M',
      introPrice: null,
    }
    getOfferings.mockResolvedValue({
      current: {
        availablePackages: [
          {
            identifier: 'annual',
            product: { identifier: 'com.torq.renomargin.pro.annual' },
            presentedOfferingContext: { offeringIdentifier: 'default' },
          },
        ],
      },
      all: {},
    })
    getProducts.mockResolvedValue({ products: [storeProduct] })
    purchaseStoreProduct.mockResolvedValue({
      productIdentifier: PRO_ID,
      customerInfo: { entitlements: { active: {}, all: {} } },
      transaction: {},
    })

    await purchaseProMonthly()

    expect(purchasePackage).not.toHaveBeenCalled()
    expect(purchaseStoreProduct).toHaveBeenCalledWith({ product: storeProduct })
  })

  it('returns a cancellation and does not throw', async () => {
    await asUser()
    const pkg = monthlyPackage()
    getOfferings.mockResolvedValue({
      current: { availablePackages: [pkg] },
      all: {},
    })
    purchasePackage.mockRejectedValue({
      message: 'Purchase was cancelled.',
      code: '1',
      data: { userCancelled: true, readableErrorCode: 'PURCHASE_CANCELLED_ERROR' },
    })

    const result = await purchaseProMonthly()

    expect(result).toEqual({ available: true, cancelled: true })
  })

  it('returns a store error and does not throw', async () => {
    const spy = vi.spyOn(console, 'error')
    await asUser()
    const pkg = monthlyPackage()
    getOfferings.mockResolvedValue({
      current: { availablePackages: [pkg] },
      all: {},
    })
    purchasePackage.mockRejectedValue({ message: 'Store problem', code: '2' })

    const result = await purchaseProMonthly()

    expect(result).toEqual({
      available: false,
      reason: 'error',
      message: 'Store problem',
    })
    expect(spy).toHaveBeenCalledTimes(1)
    const logged = String(spy.mock.calls[0]?.[0])
    expect(logged.startsWith('[paywall]')).toBe(true)
    expect(logged).toContain('Store problem')
    expect(logged).not.toContain('appl_test')
    expect(logged).not.toContain('user-1')
    expect(spy.mock.calls[0]).toHaveLength(1)
  })

  it('returns not-native and does not call purchase', async () => {
    isNativePlatform.mockReturnValue(false)

    const result = await purchaseProMonthly()

    expect(result).toEqual({ available: false, reason: 'not-native' })
    expect(purchasePackage).not.toHaveBeenCalled()
    expect(purchaseStoreProduct).not.toHaveBeenCalled()
    expect(configure).not.toHaveBeenCalled()
  })
})

describe('loadProMonthlyProduct', () => {
  it('maps the offering product without returning the package', async () => {
    const pkg = monthlyPackage()
    getOfferings.mockResolvedValue({
      current: { availablePackages: [pkg] },
      all: {},
    })

    const result = await loadProMonthlyProduct()

    expect(result).toEqual({
      available: true,
      product: {
        productId: PRO_ID,
        priceString: '$19.99',
        subscriptionPeriod: 'P1M',
        intro: null,
      },
    })
    expect(getProducts).not.toHaveBeenCalled()
  })
})

describe('RevenueCat session', () => {
  it('configures once across init, load, purchase, and restore, and logIn does not configure again', async () => {
    await initRevenueCat('user-1')
    await loadProMonthlyProduct()
    await purchaseProMonthly()
    await restorePurchases()
    await rcLogIn('user-2')

    expect(configure).toHaveBeenCalledTimes(1)
    expect(configure).toHaveBeenCalledWith({ apiKey: 'appl_test', appUserID: 'user-1' })
    expect(logIn).toHaveBeenCalledTimes(1)
    expect(logIn).toHaveBeenCalledWith({ appUserID: 'user-2' })
  })

  it('does not configure or logIn again for the same user id', async () => {
    await initRevenueCat('user-1')
    await initRevenueCat('user-1')

    expect(configure).toHaveBeenCalledTimes(1)
    expect(logIn).not.toHaveBeenCalled()
  })

  it('configures the first user and logs in when the user id changes', async () => {
    await initRevenueCat('user-a')
    await initRevenueCat('user-b')

    expect(configure).toHaveBeenCalledTimes(1)
    expect(configure).toHaveBeenCalledWith({ apiKey: 'appl_test', appUserID: 'user-a' })
    expect(logIn).toHaveBeenCalledTimes(1)
    expect(logIn).toHaveBeenCalledWith({ appUserID: 'user-b' })
  })

  it('configures again after a configure failure', async () => {
    configure.mockRejectedValueOnce(new Error('configure failed'))

    const first = await initRevenueCat('user-1')
    expect(first).toEqual({
      available: false,
      reason: 'error',
      message: 'configure failed',
    })
    expect(configure).toHaveBeenCalledTimes(1)

    const second = await initRevenueCat('user-1')
    expect(second.available).toBe(true)
    expect(configure).toHaveBeenCalledTimes(2)
    expect(configure).toHaveBeenLastCalledWith({ apiKey: 'appl_test', appUserID: 'user-1' })
  })

  it('configures a no-id call once with a null app user id', async () => {
    await initRevenueCat()
    await initRevenueCat()

    expect(configure).toHaveBeenCalledTimes(1)
    expect(configure).toHaveBeenCalledWith({ apiKey: 'appl_test', appUserID: null })
    expect(logIn).not.toHaveBeenCalled()
  })

  it('returns pending for Ask to Buy and does not log a failure', async () => {
    const spy = vi.spyOn(console, 'error')
    await asUser()
    const pkg = monthlyPackage()
    getOfferings.mockResolvedValue({
      current: { availablePackages: [pkg] },
      all: {},
    })
    purchasePackage.mockRejectedValue({
      code: '20',
      readableErrorCode: 'PAYMENT_PENDING_ERROR',
      message: 'The payment is pending.',
    })

    const result = await purchaseProMonthly()

    expect(result).toEqual({ available: true, pending: true })
    expect(spy).not.toHaveBeenCalled()
  })

  it('refuses purchase and restore when the RevenueCat user is anonymous', async () => {
    await initRevenueCat('user-1')
    getAppUserID.mockResolvedValue({ appUserID: '$RCAnonymousID:abc' })

    const purchased = await purchaseProMonthly()
    const restored = await restorePurchases()

    expect(purchased).toEqual({ available: false, reason: 'not-signed-in' })
    expect(restored).toEqual({ available: false, reason: 'not-signed-in' })
    expect(purchasePackage).not.toHaveBeenCalled()
    expect(purchaseStoreProduct).not.toHaveBeenCalled()
    expect(pluginRestore).not.toHaveBeenCalled()
  })

  it('refuses purchase and restore when no user id was configured', async () => {
    const purchased = await purchaseProMonthly()
    const restored = await restorePurchases()

    expect(purchased).toEqual({ available: false, reason: 'not-signed-in' })
    expect(restored).toEqual({ available: false, reason: 'not-signed-in' })
    expect(configure).not.toHaveBeenCalled()
    expect(purchasePackage).not.toHaveBeenCalled()
    expect(purchaseStoreProduct).not.toHaveBeenCalled()
    expect(pluginRestore).not.toHaveBeenCalled()
  })
})
