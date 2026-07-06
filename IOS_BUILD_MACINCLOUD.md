# RenoMargin iOS — MacinCloud Build Guide

The entire iOS project lives in `ios/` and is committed to this repo. You never
edit code on the Mac — you only build and upload there. Repeat these steps for
every new binary (version bumps, plugin changes). **Web-only changes never need
a new binary** — the app loads the live Vercel deployment, so `git push` to
main is your web release process.

## One-time setup (first build)

1. **Create the app record in App Store Connect** (can be done from Windows first):
   - Apps → ➕ → New App → iOS
   - Name: **RenoMargin** · Bundle ID: **com.torq.renomargin** (register it at
     developer.apple.com → Identifiers if it's not in the dropdown)
   - SKU: `renomargin-001`

2. **On MacinCloud** (portal.macincloud.com → your Mac server):
   ```bash
   git clone https://github.com/pilotwaffle/Renovation-projection-job-costing.git
   cd Renovation-projection-job-costing
   npm install
   npx cap sync ios
   open ios/App/App.xcodeproj
   ```
   (Capacitor 8 uses Swift Package Manager — no CocoaPods / `pod install` needed.
   Xcode resolves the packages automatically on first open.)

3. **In Xcode, one-time signing setup:**
   - Select the **App** target → Signing & Capabilities
   - Team: your Apple Developer team (Barry Flowers)
   - Check "Automatically manage signing"
   - Bundle Identifier should read `com.torq.renomargin`

## Every build

1. On the Mac: `git pull && npm install && npx cap sync ios`
2. In Xcode: bump **Version** (marketing, e.g. 1.0.0) and **Build** number
   (must increase every upload) on the App target → General tab
3. Select destination **Any iOS Device (arm64)**
4. Menu: **Product → Archive**
5. When the Organizer opens: **Distribute App → App Store Connect → Upload**
   (accept defaults; signing is automatic)
6. Wait ~10 minutes — the build appears in App Store Connect → RenoMargin →
   TestFlight. The export-compliance question is pre-answered
   (`ITSAppUsesNonExemptEncryption = false` is already in Info.plist).

## TestFlight (same pattern as your other apps)

- Create an **Internal Testing** group ("ME"), add yourself, attach the build —
  no review wait, appears in the TestFlight app on your iPhone immediately.

## What's already configured in this repo

| Thing | Where |
|---|---|
| App ID / name | `capacitor.config.ts` (`com.torq.renomargin` / RenoMargin) |
| Live-server URL | `capacitor.config.ts` → points at the Vercel production app |
| Native plugins | Camera, Haptics, Splash, StatusBar, App, Network |
| Permission strings | `ios/App/App/Info.plist` (camera, photos, location) |
| Export compliance | `ITSAppUsesNonExemptEncryption = false` in Info.plist |
| App icon + splash | `Assets.xcassets` — regenerate with `node scripts/generate-ios-assets.js` |

## Before public App Store submission (not needed for TestFlight)

- [ ] In-app **account deletion** (Apple requires it for apps with sign-in)
- [ ] App Privacy "nutrition label" answers in App Store Connect
- [ ] Screenshots (6.7" and 6.5" iPhone at minimum)
- [ ] Support URL + privacy policy URL on the app's product page
- [ ] Decide subscription model (web-only Stripe vs Apple IAP) before adding
      any paywall UI to the app
