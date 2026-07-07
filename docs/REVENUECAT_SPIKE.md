# RevenueCat iOS Device Spike

**Status:** spike artifact only — NOT the subscription implementation.
**Branch:** `spike/revenuecat-ios-device`
**Purpose:** prove (or disprove) that `Purchases.configure()` and the
RevenueCat Capacitor SDK work from this app's live-server webview
(`server.url` pointing at the Vercel deployment) on a real iOS device with a
sandbox Apple ID, per §7/§12 of `SUBSCRIPTION_PLAN.md` ("Validate the
Capacitor live-server bridge on a real device with a sandbox Apple ID before
writing any paywall UI").

This spike does **not** implement: a paywall, Pro gating, the
`pro_active` entitlement column/migration, the RevenueCat webhook route, or
any server-side enforcement. See `SUBSCRIPTION_PLAN.md` for the full plan —
those come in later PRs (PR-B through PR-E).

---

## 1. What this spike adds

- `@revenuecat/purchases-capacitor@13.2.1` dependency.
- `lib/revenuecat/client.ts` — client-only wrapper. Dynamically imports the
  native plugin only when `Capacitor.isNativePlatform()` is true; never
  throws; returns typed `{ available: false, reason }` results on web or
  when the public key is missing.
- `app/dev/revenuecat/page.tsx` + `Diagnostics.tsx` — an unlinked, internal
  diagnostics page with buttons to exercise each SDK call and print raw
  results.
- `NEXT_PUBLIC_REVENUECAT_IOS_KEY` env var placeholder in
  `.env.local.example`.

## 2. Operator prerequisites (from `SUBSCRIPTION_PLAN.md`, read that file first)

Before a device run can produce meaningful results, the following must
exist (owner/operator-executed, outside this repo):

**App Store Connect:**
- App record for bundle id `com.torq.renomargin`.
- **In-App Purchase** capability added to the app target in Xcode.
- Subscription group **"RenoMargin Pro"**.
- Subscription product `com.torq.renomargin.pro.monthly` — $3.99/mo.
- Introductory offer: free, **3 days**, one per user (this is the trial).
- A **sandbox tester** Apple ID (App Store Connect → Users and Access →
  Sandbox Testers) signed into the test device's sandbox account, not the
  device's real Apple ID.

**RevenueCat dashboard:**
- RevenueCat project/app for iOS bundle `com.torq.renomargin`.
- Entitlement identifier **`pro`**.
- Offering (e.g. `default`) with a **Package** (monthly) mapped to
  `com.torq.renomargin.pro.monthly`.
- App Store Connect API key (issuer + key id + `.p8`) attached so RevenueCat
  can read product metadata and validate receipts.
- Public SDK key copied from RevenueCat (Project settings → API keys →
  "Apple App Store" **public** key — not the secret REST key).

## 3. Exact device-run steps (operator-executed — cannot be done from this Windows dev environment)

This Windows environment has no Xcode/CocoaPods/simulator/device access, so
none of the following can be executed here. The operator must run these
steps on a Mac with Xcode and a physical iOS device (or simulator, though
StoreKit sandbox purchases require a real device):

1. Set `NEXT_PUBLIC_REVENUECAT_IOS_KEY` in Vercel (Preview and/or
   Production environment, matching whichever the iOS shell points at) to
   the RevenueCat **public** SDK key. Do not use the secret key.
2. Deploy so the live-server origin serves the updated build with the env
   var present.
3. On the Mac: `npx cap sync ios` (this repo could not complete this step
   in the Windows dev environment — see §5 below). Open
   `ios/App/App.xcworkspace` (or `.xcodeproj`) in Xcode and add the
   **In-App Purchase** capability to the app target if not already present.
4. Build and run on a physical device signed in to a **sandbox** Apple ID
   (Settings → App Store → Sandbox Account on the device, or sign in when
   prompted during a sandbox purchase).
5. In the running app, navigate to `/dev/revenuecat` (type the URL directly
   — it is not linked from any nav).
6. Tap buttons in this order and record each JSON result:
   - **Initialize RevenueCat** — expect `{ available: true }`. If
     `{ available: false, reason: 'missing-key' }`, the env var did not
     reach the deployed build. If `{ available: false, reason: 'not-native' }`
     while running on-device, that itself is a critical spike finding (the
     live-server webview is not reporting as a native platform) and should be
     escalated immediately.
   - **Log in (Supabase uid)** — requires being logged into the app with a
     Supabase session first; expect `{ available: true, created, entitlements }`.
     If `{ available: false, reason: 'no-supabase-session' }`, log into the
     app first.
   - **Get Offerings** — expect either:
     - `{ available: true, current: { offeringId, packages: [...] } }` — the
       SDK initialized *and* offerings are configured correctly, or
     - `{ available: false, reason: 'no-offerings' }` — **this is a
       distinct, non-error outcome**: it means the SDK bridge and
       `configure()` call succeeded, but no Offering/Package is configured
       in the RevenueCat dashboard yet (or the product isn't approved/ready
       in ASC yet). Record this explicitly as "SDK initializes but
       offerings unavailable" — it is still a partial pass for the bridge
       question, just not a full pass for the product-catalog question.
   - **Get CustomerInfo** — expect `{ available: true, entitlements: { proActive, activeEntitlements, allEntitlements } }`.
   - **Restore Purchases** — expect `{ available: true, entitlements }`
     (with no sandbox purchase yet, entitlements will show `proActive: false`
     with empty arrays — that's expected, not a failure).
7. Record the "Platform", "Key present", and "pro entitlement active" lines
   shown at the top of the diagnostics page for each step.

**Do NOT trigger a real purchase without explicit owner approval.** This
diagnostics page intentionally does not expose `purchasePackage`/
`purchaseStoreProduct` — only read/init/restore calls. If a purchase flow is
later added for testing, it must use a sandbox Apple ID only, never a
production Apple ID, and only after the owner explicitly approves that step.

## 4. Interpreting results

| Result | Meaning |
|---|---|
| `{ available: false, reason: 'not-native' }` on web browser | Expected — this is the correct, safe web fallback. |
| `{ available: false, reason: 'not-native' }` on-device in the iOS app | **Unexpected / spike failure** — Capacitor isn't reporting native context in the live-server webview. Escalate. |
| `{ available: false, reason: 'missing-key' }` | Env var not set/deployed. Fix Vercel env and redeploy. |
| `{ available: true }` from Initialize but `no-offerings` from Get Offerings | Bridge works; RevenueCat/ASC product catalog not fully configured yet. Not a bridge failure. |
| `{ available: false, reason: 'error', message }` | Real SDK/config error — read `message`, check RevenueCat dashboard + ASC config. |

## 5. Native sync status (this environment)

`npx cap sync ios` was run from this Windows dev environment as part of this
spike. See the builder's report for the exact outcome (success with files
changed under `ios/`, or the expected failure reason on Windows without
CocoaPods/Xcode). If it failed here, the SPM link step (and, if ever
needed, `pod install` for any Podfile-based dependencies) must be completed
by the operator on a Mac. Do not hand-edit `ios/App/CapApp-SPM/Package.swift`
— it is CLI-managed (see the "DO NOT MODIFY THIS FILE" header in that file)
and must only be updated via `cap sync`.

## 6. Cleanup

Once the device spike is complete and results are recorded, this whole
harness (`lib/revenuecat/client.ts` if not carried forward as-is,
`app/dev/revenuecat/`, this doc) should either be promoted into the real
PR-A/PR-B implementation described in `SUBSCRIPTION_PLAN.md` §13, or removed
if the approach changes. It should not ship to production as a permanently
reachable route.

## Enabling the diagnostics page for the device run

The `/dev/revenuecat` route is **disabled by default** (returns 404) so it is
never a live URL in production. To run the on-device spike:

1. In Vercel → project env, set **`NEXT_PUBLIC_ENABLE_RC_DIAGNOSTICS=true`**
   (Preview and/or Production, matching where the device build points), and set
   **`NEXT_PUBLIC_REVENUECAT_IOS_KEY`** to the RevenueCat public iOS SDK key.
2. Redeploy.
3. On the device, open `/dev/revenuecat` and run the buttons in order.
4. When the spike is complete, **set the flag back to `false` (or remove it)**
   and delete this route in PR-B/PR-C cleanup.
