import { describe, it, expect, vi } from 'vitest'
import {
  maybeRequestStoreReview,
  REVIEW_PROMPTED_KEY,
  type ReviewPromptStorage,
  type StoreReviewDeps,
} from '@/lib/review/store-review'

function memoryStorage(initial?: Record<string, string>): ReviewPromptStorage {
  const store = new Map(Object.entries(initial ?? {}))
  return {
    getItem(key) {
      return store.has(key) ? store.get(key)! : null
    },
    setItem(key, value) {
      store.set(key, value)
    },
  }
}

function readyDeps(
  storage: ReviewPromptStorage,
  requestReview: StoreReviewDeps['requestReview'],
  overrides: Partial<Pick<StoreReviewDeps, 'isNativePlatform' | 'isPluginAvailable'>> = {}
): StoreReviewDeps {
  return {
    storage,
    isNativePlatform: overrides.isNativePlatform ?? (() => true),
    isPluginAvailable: overrides.isPluginAvailable ?? (() => true),
    requestReview,
  }
}

describe('maybeRequestStoreReview', () => {
  it('requests once and stores the flag when native and the plugin is available', async () => {
    const storage = memoryStorage()
    const requestReview = vi.fn(async () => {})

    const result = await maybeRequestStoreReview(readyDeps(storage, requestReview))

    expect(requestReview).toHaveBeenCalledTimes(1)
    expect(storage.getItem(REVIEW_PROMPTED_KEY)).toBe('1')
    expect(result).toEqual({ requested: true })
  })

  it('calls native only on the first of two sequential calls that share storage', async () => {
    const storage = memoryStorage()
    const requestReview = vi.fn(async () => {})
    const deps = readyDeps(storage, requestReview)

    const first = await maybeRequestStoreReview(deps)
    const second = await maybeRequestStoreReview(deps)

    expect(first).toEqual({ requested: true })
    expect(second).toEqual({ requested: false, reason: 'already-prompted' })
    expect(requestReview).toHaveBeenCalledTimes(1)
  })

  it('does not call native when the flag is already set', async () => {
    const storage = memoryStorage({ [REVIEW_PROMPTED_KEY]: '1' })
    const requestReview = vi.fn(async () => {})

    const result = await maybeRequestStoreReview(readyDeps(storage, requestReview))

    expect(requestReview).toHaveBeenCalledTimes(0)
    expect(result).toEqual({ requested: false, reason: 'already-prompted' })
  })

  it('leaves the flag unset and skips native off a native platform', async () => {
    const storage = memoryStorage()
    const requestReview = vi.fn(async () => {})

    const result = await maybeRequestStoreReview(
      readyDeps(storage, requestReview, { isNativePlatform: () => false })
    )

    expect(requestReview).toHaveBeenCalledTimes(0)
    expect(storage.getItem(REVIEW_PROMPTED_KEY)).toBeNull()
    expect(result).toEqual({ requested: false, reason: 'not-native' })
  })

  it('leaves the flag unset when the plugin is not registered', async () => {
    const storage = memoryStorage()
    const requestReview = vi.fn(async () => {})

    const result = await maybeRequestStoreReview(
      readyDeps(storage, requestReview, { isPluginAvailable: () => false })
    )

    expect(requestReview).toHaveBeenCalledTimes(0)
    expect(storage.getItem(REVIEW_PROMPTED_KEY)).toBeNull()
    expect(result).toEqual({ requested: false, reason: 'plugin-unavailable' })
  })

  it('resolves with request-failed and lets a later success call native once', async () => {
    const storage = memoryStorage()
    const requestReview = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('bridge down'))
      .mockResolvedValueOnce(undefined)
    const deps = readyDeps(storage, requestReview)

    await expect(maybeRequestStoreReview(deps)).resolves.toEqual({
      requested: false,
      reason: 'request-failed',
    })
    expect(storage.getItem(REVIEW_PROMPTED_KEY)).toBeNull()

    await expect(maybeRequestStoreReview(deps)).resolves.toEqual({ requested: true })
    expect(requestReview).toHaveBeenCalledTimes(2)
    expect(storage.getItem(REVIEW_PROMPTED_KEY)).toBe('1')
  })

  it('resolves with storage-failed when reading the flag throws', async () => {
    const requestReview = vi.fn(async () => {})
    const storage: ReviewPromptStorage = {
      getItem() {
        throw new Error('denied')
      },
      setItem() {
        throw new Error('denied')
      },
    }

    await expect(
      maybeRequestStoreReview(readyDeps(storage, requestReview))
    ).resolves.toEqual({ requested: false, reason: 'storage-failed' })
    expect(requestReview).toHaveBeenCalledTimes(0)
  })

  it('still reports requested when persisting the flag throws', async () => {
    const requestReview = vi.fn(async () => {})
    const storage: ReviewPromptStorage = {
      getItem() {
        return null
      },
      setItem() {
        throw new Error('quota')
      },
    }

    await expect(
      maybeRequestStoreReview(readyDeps(storage, requestReview))
    ).resolves.toEqual({ requested: true })
    expect(requestReview).toHaveBeenCalledTimes(1)
  })
})
