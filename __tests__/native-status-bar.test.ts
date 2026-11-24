import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import {
  applyNativeStatusBar,
  STATUS_BAR_BACKGROUND,
  type NativeStatusBarDeps,
} from '@/lib/native/status-bar'

function makeDeps(overrides: Partial<NativeStatusBarDeps> = {}) {
  const calls: string[] = []
  const deps: NativeStatusBarDeps = {
    isNativePlatform: () => true,
    getPlatform: () => 'ios',
    isPluginAvailable: (name) => name === 'StatusBar',
    setOverlaysWebView: vi.fn(async (overlay: boolean) => {
      calls.push(`overlay:${overlay}`)
    }),
    setBackgroundColor: vi.fn(async (color: string) => {
      calls.push(`color:${color}`)
    }),
    setStyleLight: vi.fn(async () => {
      calls.push('style:light')
    }),
    ...overrides,
  }
  return { deps, calls }
}

describe('applyNativeStatusBar', () => {
  it('in the iOS shell, sets colour and dark-text style, then stops overlaying the web view', async () => {
    const { deps, calls } = makeDeps()
    await expect(applyNativeStatusBar(deps)).resolves.toEqual({ applied: true })
    expect(calls).toEqual([`color:${STATUS_BAR_BACKGROUND}`, 'style:light', 'overlay:false'])
  })

  it('does nothing in a browser tab', async () => {
    const { deps, calls } = makeDeps({ isNativePlatform: () => false, getPlatform: () => 'web' })
    await expect(applyNativeStatusBar(deps)).resolves.toEqual({
      applied: false,
      reason: 'not-ios-native',
    })
    expect(calls).toEqual([])
  })

  it('does nothing on Android', async () => {
    const { deps, calls } = makeDeps({ getPlatform: () => 'android' })
    await expect(applyNativeStatusBar(deps)).resolves.toEqual({
      applied: false,
      reason: 'not-ios-native',
    })
    expect(calls).toEqual([])
  })

  it('does nothing when the StatusBar plugin is not in the binary', async () => {
    const { deps, calls } = makeDeps({ isPluginAvailable: () => false })
    await expect(applyNativeStatusBar(deps)).resolves.toEqual({
      applied: false,
      reason: 'plugin-unavailable',
    })
    expect(calls).toEqual([])
  })

  it('never rejects when a plugin call fails', async () => {
    const { deps } = makeDeps({
      setOverlaysWebView: async () => {
        throw new Error('bridge down')
      },
    })
    await expect(applyNativeStatusBar(deps)).resolves.toEqual({
      applied: false,
      reason: 'call-failed',
    })
  })

  it('never rejects when platform detection throws', async () => {
    const { deps } = makeDeps({
      isNativePlatform: () => {
        throw new Error('no Capacitor')
      },
    })
    await expect(applyNativeStatusBar(deps)).resolves.toEqual({
      applied: false,
      reason: 'call-failed',
    })
  })
})

describe('root layout', () => {
  it('mounts NativeStatusBar so every page gets the fix, not just /paywall', () => {
    const layout = readFileSync(path.resolve(__dirname, '../app/layout.tsx'), 'utf8')
    expect(layout).toContain('import { NativeStatusBar } from "./components/native-status-bar"')
    expect(layout).toContain('<NativeStatusBar />')
    expect(layout).toContain('viewportFit: "cover"')
  })

  it('imports the status-bar plugin only lazily inside the component', () => {
    const src = readFileSync(
      path.resolve(__dirname, '../app/components/native-status-bar.tsx'),
      'utf8'
    )
    expect(src.startsWith("'use client'")).toBe(true)
    expect(src).not.toMatch(/^import .*@capacitor\/status-bar/m)
    expect(src).toContain("await import('@capacitor/status-bar')")
  })
})
