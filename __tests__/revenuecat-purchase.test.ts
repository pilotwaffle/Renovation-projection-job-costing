import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const {
  isNativePlatform,
  configure,
  getOfferings,
  getProducts,
  purchasePackage,
  purchaseStoreProduct,
  getCustomerInfo,
  purchasesPlugin,
} = vi.hoisted(() => {
  const configure = vi.fn()
  const getOfferings = vi.fn()
  const getProducts = vi.fn()
  const purchasePackage = vi.fn()
  const purchaseStoreProduct = vi.fn()
  const getCustomerInfo = vi.fn()
  // Plain object. A thenable here makes Capacitor probe `.then` on iOS.
  const purchasesPlugin = {
    configure,
    getOfferings,
    getProducts,
    purchasePackage,
    purchaseStoreProduct,
    getCustomerInfo,
  }
  return {
    isNativePlatform: vi.fn(() => true),
    configure,
    getOfferings,
    getProducts,
    purchasePackage,
    purchaseStoreProduct,
    getCustomerInfo,
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

import { purchaseProMonthly, loadProMonthlyProduct } from '@/lib/revenuecat/client'

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
  vi.clearAllMocks()
  vi.stubEnv('NEXT_PUBLIC_REVENUECAT_IOS_KEY', 'appl_test')
  isNativePlatform.mockReturnValue(true)
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
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('purchaseProMonthly', () => {
  it('purchases the current offering package and reports the pro entitlement', async () => {
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
