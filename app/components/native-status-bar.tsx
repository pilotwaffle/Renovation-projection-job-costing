'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import { applyNativeStatusBar } from '@/lib/native/status-bar'

function apply(): void {
  void applyNativeStatusBar({
    isNativePlatform: () => Capacitor.isNativePlatform(),
    getPlatform: () => Capacitor.getPlatform(),
    isPluginAvailable: (name) => Capacitor.isPluginAvailable(name),
    // Call the plugin inside each function. Do not return the plugin proxy
    // from an async function: awaiting the proxy hits the Capacitor bridge.
    setOverlaysWebView: async (overlay) => {
      const { StatusBar } = await import('@capacitor/status-bar')
      await StatusBar.setOverlaysWebView({ overlay })
    },
    setBackgroundColor: async (color) => {
      const { StatusBar } = await import('@capacitor/status-bar')
      await StatusBar.setBackgroundColor({ color })
    },
    setStyleLight: async () => {
      const { StatusBar, Style } = await import('@capacitor/status-bar')
      await StatusBar.setStyle({ style: Style.Light })
    },
  })
}

// Renders nothing. Re-applies on every route change and when the app comes
// back to the foreground: the 1.2 (3) shell has no StatusBar config, so the
// plugin resets to overlay mode whenever the native view re-appears (for
// example after the camera sheet closes). Each call is a no-op when the
// state already matches.
export function NativeStatusBar() {
  const pathname = usePathname()

  useEffect(() => {
    apply()
  }, [pathname])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') apply()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  return null
}
