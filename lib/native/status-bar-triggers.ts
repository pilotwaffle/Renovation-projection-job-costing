// When to re-apply the status-bar fix in the iOS shell.
//
// The 1.2 (3) binary has no StatusBar config. Whenever the shell's root view
// controller re-appears (after the full-screen camera, a photo picker, or any
// native sheet that covers it), @capacitor/status-bar re-applies its config
// defaults: overlay on, black, default style. That moves the web view back
// under the clock.
//
// Triggers, and why each one is here:
// - resize: the plugin's overlay flip changes the web view's frame, which
//   resizes the viewport. This is the event that reliably follows the reset,
//   whatever native UI caused it. Rotation lands here too.
// - visibilitychange -> visible: app returns to the foreground.
// - file <input> change or cancel (captured on document): the camera and photo
//   picker in this app are <input type="file"> (PhotoUploader, CSV import), not
//   @capacitor/camera. Both outcomes are covered. The picker's dismissal can
//   finish after the event fires, so it re-applies again after a short delay.
// - NATIVE_UI_CLOSED_EVENT: dispatched by app code when a native sheet it
//   opened has closed (the RevenueCat purchase and restore flows), on success,
//   cancel and error. Same delayed second pass.
//
// apply() must be idempotent and never throw; the plugin returns early when
// the overlay state already matches.

export const NATIVE_UI_CLOSED_EVENT = 'renomargin:native-ui-closed'
export const LATE_REAPPLY_MS = 750

/** Tell the status-bar fix that a native sheet or picker just closed. Never throws. */
export function notifyNativeUiClosed(target?: EventTarget): void {
  try {
    const t = target ?? (typeof window !== 'undefined' ? window : undefined)
    t?.dispatchEvent(new Event(NATIVE_UI_CLOSED_EVENT))
  } catch {
    // never throws
  }
}

function isFileInput(target: EventTarget | null): boolean {
  return (
    !!target &&
    (target as { tagName?: string }).tagName === 'INPUT' &&
    (target as HTMLInputElement).type === 'file'
  )
}

export function installStatusBarTriggers(
  win: Window,
  doc: Document,
  apply: () => void
): () => void {
  const timers = new Set<ReturnType<typeof setTimeout>>()

  const safeApply = () => {
    try {
      apply()
    } catch {
      // never throws
    }
  }

  const applyNowAndLater = () => {
    safeApply()
    const id = setTimeout(() => {
      timers.delete(id)
      safeApply()
    }, LATE_REAPPLY_MS)
    timers.add(id)
  }

  const onResize = () => safeApply()
  const onVisible = () => {
    if (doc.visibilityState === 'visible') safeApply()
  }
  const onFileInputDone = (e: Event) => {
    if (isFileInput(e.target)) applyNowAndLater()
  }

  win.addEventListener('resize', onResize)
  doc.addEventListener('visibilitychange', onVisible)
  doc.addEventListener('change', onFileInputDone, true)
  doc.addEventListener('cancel', onFileInputDone, true)
  win.addEventListener(NATIVE_UI_CLOSED_EVENT, applyNowAndLater)

  return () => {
    win.removeEventListener('resize', onResize)
    doc.removeEventListener('visibilitychange', onVisible)
    doc.removeEventListener('change', onFileInputDone, true)
    doc.removeEventListener('cancel', onFileInputDone, true)
    win.removeEventListener(NATIVE_UI_CLOSED_EVENT, applyNowAndLater)
    timers.forEach((id) => clearTimeout(id))
    timers.clear()
  }
}
