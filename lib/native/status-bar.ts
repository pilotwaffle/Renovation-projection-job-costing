// Keeps the iOS status bar out of the web content in the Capacitor shell.
//
// The shell loads this site from server.url with viewport-fit=cover and
// ios.contentInset 'automatic'. In that setup WKWebView fills the screen and
// sits under a transparent status bar, and WebKit's initial scroll offset
// ignores UIKit's adjusted top inset. Content at the top of a page can sit
// under the clock, and anything scrolls under it.
//
// @capacitor/status-bar is already compiled into the shipped 1.2 (3) binary.
// setOverlaysWebView({ overlay: false }) moves the web view below the status
// bar natively and paints a solid strip behind the clock. That fixes every
// page at once, with no CSS math and no new build.
//
// Rules: never throws, does nothing outside the iOS shell, and the plugin
// module is only imported inside the native branch.

export const STATUS_BAR_BACKGROUND = '#ffffff'

export interface NativeStatusBarDeps {
  isNativePlatform: () => boolean
  getPlatform: () => string
  isPluginAvailable: (name: string) => boolean
  setOverlaysWebView: (overlay: boolean) => Promise<void>
  setBackgroundColor: (color: string) => Promise<void>
  setStyleLight: () => Promise<void>
}

export type NativeStatusBarResult =
  | { applied: true }
  | { applied: false; reason: 'not-ios-native' | 'plugin-unavailable' | 'call-failed' }

export async function applyNativeStatusBar(
  deps: NativeStatusBarDeps
): Promise<NativeStatusBarResult> {
  try {
    if (!deps.isNativePlatform() || deps.getPlatform() !== 'ios') {
      return { applied: false, reason: 'not-ios-native' }
    }
    if (!deps.isPluginAvailable('StatusBar')) {
      return { applied: false, reason: 'plugin-unavailable' }
    }
    // Colour and style first so the strip never flashes black (the plugin's
    // default) when it appears.
    await deps.setBackgroundColor(STATUS_BAR_BACKGROUND)
    await deps.setStyleLight()
    await deps.setOverlaysWebView(false)
    return { applied: true }
  } catch {
    return { applied: false, reason: 'call-failed' }
  }
}
