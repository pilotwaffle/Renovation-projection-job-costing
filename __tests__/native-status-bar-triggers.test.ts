import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  installStatusBarTriggers,
  notifyNativeUiClosed,
  NATIVE_UI_CLOSED_EVENT,
  LATE_REAPPLY_MS,
} from '@/lib/native/status-bar-triggers'

describe('installStatusBarTriggers', () => {
  let apply: ReturnType<typeof vi.fn<() => void>>
  let uninstall: () => void

  beforeEach(() => {
    vi.useFakeTimers()
    apply = vi.fn<() => void>()
    uninstall = installStatusBarTriggers(window, document, apply)
  })
  afterEach(() => {
    uninstall()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('re-applies on window resize (the plugin flips overlay back and resizes the web view)', () => {
    window.dispatchEvent(new Event('resize'))
    expect(apply).toHaveBeenCalledTimes(1)
  })

  it('re-applies when the app returns to the foreground', () => {
    document.dispatchEvent(new Event('visibilitychange'))
    expect(apply).toHaveBeenCalledTimes(1)
  })

  it.each(['change', 'cancel'])(
    're-applies now and again shortly after a file input %s (camera / photo picker closed)',
    (type) => {
      const input = document.createElement('input')
      input.type = 'file'
      document.body.appendChild(input)
      input.dispatchEvent(new Event(type, { bubbles: false }))
      expect(apply).toHaveBeenCalledTimes(1)
      vi.advanceTimersByTime(LATE_REAPPLY_MS)
      expect(apply).toHaveBeenCalledTimes(2)
    }
  )

  it('ignores change events from ordinary inputs', () => {
    const input = document.createElement('input')
    input.type = 'text'
    document.body.appendChild(input)
    input.dispatchEvent(new Event('change', { bubbles: true }))
    vi.advanceTimersByTime(LATE_REAPPLY_MS)
    expect(apply).not.toHaveBeenCalled()
  })

  it('re-applies now and later when app code reports a native sheet closed', () => {
    notifyNativeUiClosed()
    expect(apply).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(LATE_REAPPLY_MS)
    expect(apply).toHaveBeenCalledTimes(2)
  })

  it('swallows an apply that throws', () => {
    apply.mockImplementation(() => {
      throw new Error('boom')
    })
    expect(() => window.dispatchEvent(new Event('resize'))).not.toThrow()
    expect(() => notifyNativeUiClosed()).not.toThrow()
    expect(() => vi.advanceTimersByTime(LATE_REAPPLY_MS)).not.toThrow()
  })

  it('removes every listener and pending timer on uninstall', () => {
    notifyNativeUiClosed()
    apply.mockClear()
    uninstall()
    window.dispatchEvent(new Event('resize'))
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event(NATIVE_UI_CLOSED_EVENT))
    vi.advanceTimersByTime(LATE_REAPPLY_MS)
    expect(apply).not.toHaveBeenCalled()
    uninstall = () => {}
  })
})

describe('notifyNativeUiClosed', () => {
  it('never throws, even with a target whose dispatch throws', () => {
    const bad = { dispatchEvent: () => { throw new Error('x') } } as unknown as EventTarget
    expect(() => notifyNativeUiClosed(bad)).not.toThrow()
  })
})
