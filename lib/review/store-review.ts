export const REVIEW_PROMPTED_KEY = 'renomargin.reviewPrompted'

export interface ReviewPromptStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface StoreReviewDeps {
  storage: ReviewPromptStorage
  isNativePlatform: () => boolean
  isPluginAvailable: () => boolean
  requestReview: () => Promise<void>
}

export type StoreReviewResult =
  | { requested: true }
  | {
      requested: false
      reason:
        | 'already-prompted'
        | 'not-native'
        | 'plugin-unavailable'
        | 'request-failed'
        | 'storage-failed'
    }

/**
 * Asks for a store review at most once. Never rejects. The flag is written
 * only after the native request resolves, so a missing plugin or a failed
 * call can still prompt on a later success.
 */
export async function maybeRequestStoreReview(
  deps: StoreReviewDeps
): Promise<StoreReviewResult> {
  let failure: 'storage-failed' | 'request-failed' = 'storage-failed'

  try {
    const prompted = deps.storage.getItem(REVIEW_PROMPTED_KEY)
    if (prompted === '1') {
      return { requested: false, reason: 'already-prompted' }
    }

    // A storage read that throws is the only storage-failed path. Later
    // failures must not be reported as a storage problem.
    failure = 'request-failed'

    if (!deps.isNativePlatform()) {
      return { requested: false, reason: 'not-native' }
    }

    if (!deps.isPluginAvailable()) {
      return { requested: false, reason: 'plugin-unavailable' }
    }

    await deps.requestReview()

    try {
      deps.storage.setItem(REVIEW_PROMPTED_KEY, '1')
    } catch {
      // The sheet was requested. Apple's rate limit covers a later retry
      // if this write did not land.
    }

    return { requested: true }
  } catch {
    return { requested: false, reason: failure }
  }
}
