// Native review UI appears only after `npx cap sync ios` on the Mac and a new
// iOS build. Until `InAppReview` is in the binary this is a silent no-op.

import { Capacitor } from '@capacitor/core'
import { maybeRequestStoreReview } from './store-review'

export async function requestStoreReviewAfterSuccess(): Promise<void> {
  try {
    await maybeRequestStoreReview({
      storage: localStorage,
      isNativePlatform: () => Capacitor.isNativePlatform(),
      isPluginAvailable: () => Capacitor.isPluginAvailable('InAppReview'),
      requestReview: async () => {
        // Call requestReview() in this function. Do not return the plugin
        // proxy from an async function: awaiting the proxy is treated as a
        // thenable and hits the Capacitor bridge.
        const { InAppReview } = await import('@capacitor-community/in-app-review')
        await InAppReview.requestReview()
      },
    })
  } catch {
    // success flow must not see this
  }
}
