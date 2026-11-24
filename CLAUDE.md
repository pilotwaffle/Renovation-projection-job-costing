# CLAUDE.md — RenoMargin (Renovation Job Costing)

## 1. Repo Context

Address the operator as **King Flowers**.

**RenoMargin** — renovation job-costing app. Next.js 15 web app shipped to iOS through Capacitor 8.

| Fact | Value |
| --- | --- |
| Package | `renovation-job-costing` v0.1.0 |
| Bundle ID | `com.torq.renomargin` |
| App name | **RenoMargin** |
| Web | Next.js 15.5.20 (App Router, Turbopack dev), React 19, Radix UI, TanStack Query |
| Data | Supabase (`@supabase/ssr`, `@supabase/supabase-js`) |
| Native | Capacitor 8 — app, camera, haptics, network, splash-screen, status-bar, in-app-review. StatusBar `overlaysWebView: false`, `ios.contentInset: 'never'` (web view below the clock). MARKETING_VERSION 1.2. |
| Purchases | `@revenuecat/purchases-capacitor` v13 — Apple IAP, **not Stripe** |
| Tests | Vitest + Testing Library; Playwright for e2e |
| Deploy | Vercel — `renovation-projection-job-costing.vercel.app` |
| iOS CI | Codemagic workflow `ios-testflight` in `codemagic.yaml` — **manual start only** (no `triggering:`), Xcode 27.2 / iOS 27 SDK, TestFlight **upload only** (`MIN_BUILD_NUMBER` 5; `submit_to_testflight` and `submit_to_app_store` are false). Do not start a build, add push triggers, or submit without operator approval. |

### iOS ships in live-server mode — read this before any "ship a fix" reasoning

`capacitor.config.ts` sets `server.url` to the production Vercel URL. The iOS shell **loads the live web app**, so:

- A web deploy reaches the installed app **immediately, with no App Store review cycle**.
- `webDir: 'public'` is a CLI formality and is **not** the shipped bundle.
- A change reaches iOS only **after the Vercel deploy succeeds** — not when it merges.
- `allowNavigation` is limited to the Vercel host and `*.supabase.co`. Adding an origin is a security decision requiring operator approval.

This is regular app-development work. It is **not** TORQ Console, TORQ V5/V6 harness work, `torq_mmh` / T-MMH, a governed TORQ branch, or TORQCLAW.

> **Staleness check:** verify this context against `package.json`, `capacitor.config.ts`, `STATE.md`, and recent commits before starting. If this file disagrees with the repo, report the conflict before changing architecture-level behavior.

### Instruction precedence

1. Direct operator instruction in the current session
2. This file
3. Global `E:\.claude\CLAUDE.md`
4. General Claude Code defaults

Global rules win where they are **more restrictive** on secrets, destructive actions, signing, production writes, user-owned files, or irreversible actions.

### Boundary

- Do not touch `E:\TORQ-CONSOLE` or `torq_mmh/`.
- Do not touch `E:\TORQCLAW` or `E:\TORQ-CLI`.
- Do not switch into TORQ V5/V6 harness mode.

---

## 2. Governing Harness

Role map (aligned to the global contract, operator-updated 2026-08-12):

| Role | Model | Model ID | Authority |
| --- | --- | --- | --- |
| **G1D** — planner / orchestrator | Claude Fable 5 | `claude-fable-5` | Planning, decomposition, routing, scope control |
| **G1R** — independent design reviewer | Claude Opus 5 | `claude-opus-5` | Independent design/risk review before risky implementation |
| **Builder** — implementer | Claude Sonnet 5 | `claude-sonnet-5` | Bounded implementation, refactor, tests, docs, UI work |
| **RB** — alternate debug worker | GLM-5.2 | (if available) | Long-context scan, bug isolation, log/test triage, refactor proposals |
| **G2A** — final auditor | Claude Opus 4.8 | `claude-opus-4-8` | Final adversarial review, approve/reject, native + release-risk audit |
| **Memory-writer** | Sonnet 5 or fast model | — | `STATE.md` after verified progress. `MEMORY.md` and `.claude/agent-state.json` are not in git — create either only with operator approval. |

> Superseded 2026-08-12: earlier versions of this file named **Opus 4.7** as G1R and **Haiku 4.5** as the sole memory-writer. G1R is now **Opus 5**; memory-writer is **Sonnet 5 or a fast model**. Haiku 4.5 remains fine for cheap verification, checklist grading, and log triage, but is never sole final authority on risky code, merges, security, production, or architecture. Historical `STATE.md` entries naming Haiku as verifier remain valid records.

### Authority rules

- G1D plans, scopes, and routes. It must not silently implement large changes or approve its own plan when G1R is required.
- G1R reviews non-trivial design/risk before build. It does not build and does not silently fix.
- Builder implements bounded approved work only and **cannot approve its own work**.
- GLM-5.2 may scout, triage, debug, or propose. Never final authority.
- G2A audits after build and tests. **G2A's verdict controls final pass/fail for high-impact work.** Any BLOCKER forces REJECT or a fully specified CONDITIONAL approval. Do not average away high-severity findings.
- Memory-writer records verified progress only, after G2A pass, verifier pass, or explicit operator authorization.
- Operator controls commit, push, publish, deploy, archive, App Store upload, signing changes, destructive actions, production writes, billing, paid services, and irreversible actions.

### G2A review is mandatory for

Native iOS changes · signing / provisioning / bundle ID / app name · App Store metadata · RevenueCat entitlement, offering, or product configuration · purchase behavior · production-facing behavior · user data · security · architecture · external services · release builds · archive / upload / submission · `capacitor.config.ts` `server.url` or `allowNavigation` changes.

### Role output formats

| Role | Output ends with |
| --- | --- |
| G1D | RESULT · ROUTE · AUTHORITY SOURCE · TASK BOUNDS · REQUIRED AGENTS · RISKS · NEXT AGENT PROMPT |
| G1R | VERDICT (APPROVE / CONDITIONAL / REJECT) · BLOCKERS · MAJORS · MINORS · CLAIMS AUDIT · REQUIRED DELTA · BUILDER-SAFE SCOPE |
| Builder | RESULT · CHANGES · VERIFIED · ASSUMPTIONS · NOT DONE · RISKS FOR REVIEW · G2A ESCALATION NOTES |
| RB / GLM | RESULT · FINDINGS/CHANGES · VERIFIED · ASSUMPTIONS · NOT DONE · RISKS FOR REVIEW · OPUS ESCALATION NOTES |
| G2A | VERDICT · BLOCKERS · MAJORS · MINORS · CLAIMS AUDIT · REQUIRED DELTA · RE-REVIEW SCOPE · EXACT NEXT ACTION · MEMORY-WRITER INSTRUCTION |
| Memory-writer | RESULT · FILES UPDATED · STATE RECORDED · SOURCE OF AUTHORITY · EVIDENCE USED · NOT RECORDED · NEXT ACTION |

`VERIFIED` means exact command plus exit status plus proving output lines. Paraphrase is banned.

### Agents and handoff package

`.claude/agents/` in this repo provides: `torq-g1d-planner.md` · `torq-g1r-opus.md` · `torq-builder-sonnet.md` · `torq-g2a-opus.md` · `torq-memory-writer-sonnet.md` · `torq-governance-reviewer.md` · `architect.md` · `builder.md` · `verifier.md` · `worker.md` · `memory-writer.md` · `repo-analyzer-agent.md` · `repo-verifier-agent.md` · `fleet/`

These resolve **only** in a session rooted at `E:\renovation-job-costing`. Probe the available-agents list before routing.

Apply `E:\.claude\model-handoff\00_BOOT_CARD.md` always. Load the full role manual (`01` Fable / `02` Sonnet executor / `03` Opus reviewer) only for non-trivial, high-risk, architectural, security-sensitive, native iOS, App Store-facing, subscription, production-facing, or release-facing work. The handoff transfers procedural discipline only — not intelligence, weights, or hidden reasoning.

### `/goal` starter for a full multi-model session

```text
/goal Complete the session using the subagent routing policy in .claude/agents.
Fable 5 orchestrates as G1D.
Opus 5 independently reviews as G1R when design/risk review is required.
Sonnet 5 implements bounded Builder tasks.
GLM-5.2 may be used as RB / alternate debug worker when helpful.
Opus 4.8 grades as G2A for native iOS, signing, App Store, production, subscription, data, security, architecture, or release-facing changes.
Memory-writer updates STATE.md only after tests pass and verifier/auditor passes.
Do not stop until tests pass and verifier/auditor passes, unless blocked by missing authority, unsafe repo state, permission limits, unclear product direction, native signing risk, or an owner-gated decision.
Do not touch TORQ-CONSOLE, torq_mmh, TORQCLAW, or TORQ-CLI.
Do not push, merge, delete, clean, reset, overwrite operator files, deploy, archive, submit, upload, or perform irreversible actions without explicit operator approval.
```

---

## 3. Key Files

| Path | Purpose |
| --- | --- |
| `app/` | Next.js App Router — routes, layouts, server actions |
| `app/(auth)/` | Login/signup, `AuthErrorBanner.tsx`, `SubmitButton.tsx` |
| `app/privacy/`, `app/terms/`, `app/support/`, `app/paywall/` | Public legal pages and the subscribe/paywall (Apple 3.1.2 Terms of Use link; RevenueCat / StoreKit) |
| `middleware.ts` | Route protection — **denylist** of `/dashboard`, `/jobs`, `/settings`; also holds CSP |
| `capacitor.config.ts` | Native config — `server.url` live-load, `allowNavigation`, iOS appearance. Keep StatusBar at `overlaysWebView: false`, `style: 'LIGHT'`, `backgroundColor: '#ffffff'`, and `ios.contentInset: 'never'`. Reverting these reintroduces the clock overlap. |
| `app/components/native-status-bar.tsx`, `lib/native/status-bar.ts`, `lib/native/status-bar-triggers.ts` | Web StatusBar re-apply on resize, after native UI, and on foreground (#35). Paywall top-gap tighten and Restore/Manage-when-subscribed (#36). |
| `ios/App/` | Native Xcode project (`App.xcodeproj`, `CapApp-SPM`). MARKETING_VERSION 1.2; `CURRENT_PROJECT_VERSION` in git is 4; Codemagic sets the build number to max(5, latest TestFlight + 1). |
| `codemagic.yaml`, `docs/CODEMAGIC.md` | iOS 27 SDK CI (see iOS CI row above) |
| `STATE.md` | Session state and gate history |
| `PRD.md` | Product spec. `APPSTORE_PREFLIGHT.md` and `SUBSCRIPTION_PLAN.md` are named in older notes but are **not in this repo**. |
| `.claude/agents/` | Role agent definitions |

Root holds many status/handover docs. `HANDOVER.md`, `DEPLOYMENT_STATUS_REPORT.md`, and `IMPLEMENTATION_*.md` are **tracked** in git. Additional untracked operator files may exist only on the operator's local tree — read them, never delete or reorganize them.

---

## 4. Mandatory Rules

### Native iOS and App Store — owner-gated

- Do not change Apple bundle ID (`com.torq.renomargin`), signing team, provisioning profile, app name (**RenoMargin**), App Store metadata, or native signing configuration without explicit operator approval.
- Do not change RevenueCat entitlement IDs, offering IDs, product IDs, subscription groups, prices, trials, or production config without explicit approval.
- Verify sandbox/test purchase behavior separately from production. Do not claim the purchase flow is production-ready without evidence.
- Do not alter signing/provisioning to make a build pass.
- Ask before regenerating or overwriting `ios/` native files.
- Do not change `capacitor.config.ts` `server.url` or `allowNavigation` without operator approval — these control what the shipped app loads and which origins it may reach.

### Change scoping

- Make the smallest correct change; touch only files the task requires.
- Keep web/app changes separate from native signing/config changes.
- Keep docs-only changes separate from runtime behavior changes.
- Do not move, delete, reset, clean, or overwrite project files unless the task clearly requires it and the reason is stated first.
- If the working tree has uncommitted owner edits, preserve and report them before editing. **The tree is routinely dirty with operator-owned docs and images.**
- If a package must be installed, explain the package and why before installing.
- Do not add paid services, cloud dependencies, analytics, tracking, external APIs, or SDKs unless explicitly approved.

### Known-state notes

- Billing is **Apple IAP via RevenueCat**. Dead Stripe CSP entries in `middleware.ts` are a recorded MINOR cleanup candidate — not builder-owned; do not "fix" opportunistically.
- `sw.js` runtime cache names were intentionally left unchanged during the brand sweep. Do not rename them as tidy-up.
- `middleware.ts` protection is a **denylist**, not an allowlist. Adding a public page needs no middleware change; assuming otherwise has caused churn.
- **Safe-area / status bar** (main, #35 and #36, plus the iOS shell): keep `overlaysWebView: false` and `contentInset: 'never'`. The plugin default is overlay=true, which put page tops under the clock. After #35 the iOS inset is 0, so #36 reduced the paywall's CSS top floor (it had been leaving a large empty gap) and shows Manage instead of Restore when the user is subscribed. Do not "fix" these back without evidence and operator approval.
- **Codemagic** is the iOS 27 build path on main. Do not start a build, change billing or minutes, submit to TestFlight or the App Store, or add a `triggering:` section that would build on push, without explicit operator approval.

---

## 5. Test Commands

Verify scripts before running.

```bash
npx vitest run           # unit/component tests (agents: do not use `npm test`; that is watch mode)
npm run test:ui          # vitest --ui
npm run test:e2e         # playwright test
npm run test:e2e:ui      # playwright test --ui
npm run lint             # eslint
npm run build            # next build (does not typecheck or lint; see below)
npm run dev              # next dev --turbopack

npx cap sync ios         # sync web + plugins into native project
npx cap open ios         # open Xcode
```

There is no typecheck script, and `npm run build` does not catch type or lint errors (next.config.ts ignores them). Run `npx tsc --noEmit` and confirm no new errors versus main's baseline (242 at e29a2bf after `npx npm@10.9.11 ci`). Run `npm run lint` separately.

`npm ci` must use npm 10 (`npx npm@10.9.11 ci`). npm 11 reports the lockfile out of sync (missing optional `@unrs/resolver-binding-*` entries), and an `npm install` fallback under npm 11 can skew the tsc baseline (242 → 251). Codemagic already pins npm 10.9.11.

`npm run build` needs network for `next/font` (Geist from Google Fonts) and the env vars `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (names only; never put values in this file). Without those, page-data collection fails at `/api/users/search`.

Current green counts on main@e29a2bf (2026-11-23, after #37): **187 tests / 17 files** (`npx vitest run`) and **32 static pages** from `next build` (including `/paywall`, `/terms`, and `/privacy`). The July 2026 `STATE.md` snapshot (86/86 vitest, 31 static pages) is stale.

Discipline: run the narrowest relevant check first, broaden before claiming completion. If a check cannot run, state why and what evidence replaced it. Do not claim simulator, device, or App Store behavior without actual evidence.

---

## 6. Security

- Never expose or commit secrets, tokens, API keys, certificates, provisioning profiles, signing files, App Store credentials, RevenueCat keys, Supabase keys, `.env` values, or private config.
- Do not run destructive commands. Do not run live production writes.
- Do not delete, move, overwrite, clean, or reset untracked operator files. **Report them only.**
- Never remove or weaken tests to make a build pass.
- Do not claim completion without evidence.
- Do not invent command output, test results, build logs, screenshots, file contents, CI status, simulator results, device results, or App Store status.
- Do not commit, push, publish, submit, deploy, archive, upload, or release unless the operator explicitly approves that gate.

Privacy-policy claims are load-bearing for App Store review. The current pages assert: photo deletion in account actions, no analytics SDKs, CSV export exists, no live payment collection. **If a change makes one of these false, flag it as a BLOCKER** — the legal pages must change in the same work.

---

## 7. Verification Requirements

Before reporting completion:

- Run the narrowest relevant test, then broaden.
- Report exact counts and exit status, not paraphrase.
- Review the diff for accidental edits and untracked-file collateral.
- For UI work, run a real browser check where possible — test primary interactions, error states, and resize/mobile behavior if layout changed. Capture a screenshot when visual behavior matters.
- For native work, state plainly what was **not** verified on device or simulator.
- Remember a merged web change reaches iOS only after the Vercel deploy — say so rather than implying the app is updated.

---

## 8. State and Memory

`STATE.md` is the session record. `MEMORY.md` and `.claude/agent-state.json` are not in git — create either only with operator approval.

- Memory-writer updates state only after verified progress, G2A pass, verifier pass, or explicit operator instruction.
- Keep entries concise: date, branch, commit if relevant, change, tests, verifier/auditor result, blocker, next action.
- Do not store secrets, raw logs, or one-time prompt payloads.
- Do not use state files to hide failures or rewrite history.
- Record uncommitted-but-approved work explicitly — the repo has carried G2A-approved changes awaiting operator commit approval, and losing that record has caused stale-state confusion before.

### Startup continuity scan

At session start, report:

1. Current directory
2. Instruction files found and controlling file
3. Git branch and HEAD
4. `git status --short`
5. Confirm stack: Next.js 15 + Capacitor 8 iOS, npm
6. Relevant config files found (`package.json`, `capacitor.config.ts`, `middleware.ts`)
7. `ios/` folder status
8. Current build/test scripts
9. Open items from `STATE.md` (and `APPSTORE_PREFLIGHT.md` only if that file is actually present; it is not in git)
10. Obvious blockers
11. Current task authority
12. Safest next action

Do not continue into implementation unless the next action is clear, bounded, and safe.

---

## 9. Required Output Format

Lead with the result. Then:

1. Continuity scan
2. Current active task
3. What was found
4. Next safest action
5. What changed, if anything
6. Tests/checks run
7. What passed
8. What failed or could not be verified
9. Evidence used
10. Verifier/auditor result, if any
11. Risks or limitations
12. Whether owner approval is needed before commit / push / build / archive / upload / submission

Never bury failures. Never claim completion without evidence.
