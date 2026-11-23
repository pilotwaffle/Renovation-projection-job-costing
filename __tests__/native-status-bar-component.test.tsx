import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'

const plugin = vi.hoisted(() => ({
  setOverlaysWebView: vi.fn(async () => {}),
  setBackgroundColor: vi.fn(async () => {}),
  setStyle: vi.fn(async () => {}),
}))
const platform = vi.hoisted(() => ({ native: true, name: 'ios' }))

vi.mock('next/navigation', () => ({ usePathname: () => '/paywall' }))
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => platform.native,
    getPlatform: () => platform.name,
    isPluginAvailable: () => true,
  },
}))
vi.mock('@capacitor/status-bar', () => ({
  StatusBar: plugin,
  Style: { Light: 'LIGHT', Dark: 'DARK', Default: 'DEFAULT' },
}))

import { NativeStatusBar } from '@/app/components/native-status-bar'

describe('<NativeStatusBar />', () => {
  beforeEach(() => {
    plugin.setOverlaysWebView.mockClear()
    plugin.setBackgroundColor.mockClear()
    plugin.setStyle.mockClear()
  })

  it('in the iOS shell, moves the web view below the status bar on mount', async () => {
    platform.native = true
    platform.name = 'ios'
    const { container } = render(<NativeStatusBar />)
    expect(container.innerHTML).toBe('')
    await waitFor(() => expect(plugin.setOverlaysWebView).toHaveBeenCalledWith({ overlay: false }))
    expect(plugin.setBackgroundColor).toHaveBeenCalledWith({ color: '#ffffff' })
    expect(plugin.setStyle).toHaveBeenCalledWith({ style: 'LIGHT' })
  })

  it('re-applies when the app returns to the foreground', async () => {
    platform.native = true
    platform.name = 'ios'
    render(<NativeStatusBar />)
    await waitFor(() => expect(plugin.setOverlaysWebView).toHaveBeenCalledTimes(1))
    document.dispatchEvent(new Event('visibilitychange'))
    await waitFor(() => expect(plugin.setOverlaysWebView).toHaveBeenCalledTimes(2))
  })

  it('re-applies on window resize', async () => {
    platform.native = true
    platform.name = 'ios'
    render(<NativeStatusBar />)
    await waitFor(() => expect(plugin.setOverlaysWebView).toHaveBeenCalledTimes(1))
    window.dispatchEvent(new Event('resize'))
    await waitFor(() => expect(plugin.setOverlaysWebView).toHaveBeenCalledTimes(2))
  })

  it('makes no plugin calls in a browser', async () => {
    platform.native = false
    platform.name = 'web'
    render(<NativeStatusBar />)
    await new Promise((r) => setTimeout(r, 20))
    expect(plugin.setOverlaysWebView).not.toHaveBeenCalled()
    expect(plugin.setStyle).not.toHaveBeenCalled()
  })
})
