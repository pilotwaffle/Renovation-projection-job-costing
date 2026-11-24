# Codemagic iOS builds (RenoMargin)

`codemagic.yaml` at the repo root defines one workflow, **`ios-testflight`**:

- Machine: `mac_mini_m2` (Codemagic personal free tier: 500 macOS M2 minutes/month).
- Xcode **27.2** (newest stable 27.x on Codemagic; 27.3 is "edge"/beta and Apple
  rejects uploads built with beta Xcode). Specs: https://docs.codemagic.io/specs-macos/xcode-27-2/
- Steps: `npm ci` (npm 10.9.11) -> `vitest run` (must pass) -> `cap sync ios` ->
  fail unless the iphoneos SDK is 27.x -> fetch/create App Store signing files ->
  set build number = max(5, latest TestFlight + 1) -> `xcode-project build-ipa` ->
  fail unless the IPA's `DTSDKName` starts with `iphoneos27` -> upload to App Store Connect.
- Publishing is **upload only**: `submit_to_testflight: false`, `submit_to_app_store: false`.
- **Manual start only**: no `triggering:` section, so pushes never start builds.

## Required Codemagic settings (no secrets in git)

1. Developer Portal integration (App Store Connect API key, role App Manager)
   named exactly **`codemagic_renomargin`**.
2. Environment variable group **`code-signing`** with secret variable
   **`CERTIFICATE_PRIVATE_KEY`**: an RSA 2048 private key in PEM format, used by
   `app-store-connect fetch-signing-files --create` to create/reuse an
   Apple Distribution certificate and App Store profile for `com.torq.renomargin`.
   Generate with: `ssh-keygen -t rsa -b 2048 -m PEM -f ios_distribution_private_key -q -N ""`
   and never commit it.

Docs: https://docs.codemagic.io/yaml-code-signing/alternative-code-signing-methods/ ,
https://docs.codemagic.io/yaml-publishing/app-store-connect/
