# RenoMargin TestFlight archive (PR #30 sandbox)

Numbered steps for Barry on TX544. This branch is a local build-number bump on the v1.1 native source so a new archive can be made for the #30 sandbox test. The iOS shell already loads production (`https://renovation-projection-job-costing.vercel.app` in `capacitor.config.ts`); do not change that URL. Production now serves the merged #30 paywall. Stop after Organizer. Upload and submit are Barry's call.

App Store / TestFlight already has **1.1 (2)** (uploaded 28 Jul 2026). This repo still has marketing version **1.0** and had build **1**, because the 1.1 bump was made in Xcode and never committed. This branch sets `CURRENT_PROJECT_VERSION` to **3** (one over the shipped v1.1 build). Leave the marketing version in git at 1.0.

1. On TX544, clone or fetch `pilotwaffle/Renovation-projection-job-costing` and check out `kit/testflight-pr30-2026-11-22`.
2. Run `npm ci`. On npm 11 this lockfile is reported out of sync (missing optional `@unrs/resolver-binding-*` entries). Use npm 10, for example `npx npm@10.9.11 ci`.
3. A local `npm run build` is optional. The shell does not bundle the web app; it loads the production URL. Skip the build if it fails for missing Supabase env.
4. Run `npx cap sync ios`. Do not commit any files that sync rewrites (for example path separators in `Package.swift`).
5. Open the project: `open ios/App/App.xcodeproj`.
6. Select the **App** scheme and the destination **Any iOS Device (arm64)**.
7. In the App target → General tab, confirm **Build** is **3**. Set **Version** (marketing) to **1.1** in Xcode so this archive attaches to the live 1.1 version. Do not change it in git.
8. Menu: **Product → Archive**.
9. When Organizer opens, stop. Do not Distribute, upload to App Store Connect, or submit for review unless Barry decides to.

No preview `server.url`, env flag, or production-revert step is required.
