'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import { applyNativeStatusBar } from '@/lib/native/status-bar'
import { installStatusBarTriggers } from '@/lib/native/status-bar-triggers'

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

// Renders nothing. Applies on mount and on every route change, then on the
// triggers in lib/native/status-bar-triggers.ts (resize, foreground, file
// picker/camera close, purchase/restore sheet close). Each call is a no-op
// when the state already matches, and only does anything in the iOS shell.
export function NativeStatusBar() {
  const pathname = usePathname()

  useEffect(() => {
    apply()
  }, [pathname])

  useEffect(() => installStatusBarTriggers(window, document, apply), [])

  return null
}
