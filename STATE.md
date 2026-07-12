# RenoMargin iOS Scaffolding — Session 2026-07-06

## Session 2026-07-12 — App Store preflight batch #2 + #5 + test fix (G2A APPROVED, uncommitted)

**Task**: Complete remaining APPSTORE_PREFLIGHT items — #2 (public legal pages: privacy, terms, support), #5 (auth dead-ends + brand consistency), and fix the failing CountUp test. Built by three Sonnet builders; independently verified by Haiku verifier (PASS: 86/86 vitest, next build exit 0, 31/31 static pages); audited by G2A (APPROVE, zero blockers; all four privacy-policy claims verified true against code: photo deletion in account actions Step D, no analytics SDKs, CSV export exists, no live Stripe/payment collection).

**Changes (all UNCOMMITTED on main @ 1342ee7, awaiting operator commit approval)**:
- NEW files: app/privacy/page.tsx, app/terms/page.tsx, app/support/page.tsx (static public legal pages; middleware needs no change — protection remains denylist of /dashboard|/jobs|/settings).
- NEW files: app/(auth)/AuthErrorBanner.tsx (whitelist error code mapping), app/(auth)/SubmitButton.tsx (useFormStatus pending state).
- MODIFIED: login/signup pages (async searchParams + AuthErrorBanner integration + pending-state buttons); Navigation.tsx/offline.html/sw.js/ganttChart.ts (RenoMargin brand sweep; sw.js runtime cache names intentionally untouched); dashboard/CountUp.tsx (rAF-timestamp anchoring fixes cross-clock skew; test unweakened, 86/86 now green).

**Also this session**: STATE.md was stale — commits #22 (account deletion), #23/#24 (RevenueCat spike validated on iOS + thenable-proxy fix) landed on main after the last entry. Now recorded.

**Open items**: MINOR — dead Stripe CSP entries in middleware.ts (billing is Apple IAP/RevenueCat), candidate cleanup, not builder-owned. OPERATOR — verify notifications@renovation-job-costing.com is monitored before submission (it's the contact on all three legal pages); demo-account seeding (preflight #3) still operator-gated; native camera (preflight #4) not started; changes reach iOS shell only after Vercel deploy.

**Gates**: commit/push/merge = operator approval pending (promised, not yet given).

---

## Session 2026-07-06 (latest+1) — Supabase security-advisor hardening (APPLIED + committed)

**Task**: Remediate Supabase Security Advisor WARN lints surfaced during templates triage. Operator-approved to APPLY to live DB and COMMIT to a branch.

**Applied to live DB** (project renovation-job-costing, ref ivcwzvjdnaoecrsqwrhq), two migrations:
- security_advisor_hardening — Section A: ALTER FUNCTION ... SET search_path = public, pg_temp on all 23 public functions (fixes "Function Search Path Mutable" x23). Section B initial attempt REVOKE ... FROM anon (turned out to be a no-op).
- security_advisor_hardening_revoke_public — corrected Section B: REVOKE EXECUTE ... FROM PUBLIC on the 8 SECURITY DEFINER photo functions. Root cause of the no-op: anon inherited EXECUTE via the default PUBLIC grant, not a direct anon grant.

**Verified (Opus 4.8, live catalog queries)**:
- 0 public functions without a pinned search_path (was 23).
- anon EXECUTE = false on all 8 SECURITY DEFINER photo functions; authenticated + service_role retained (app unaffected — it calls these as signed-in users).
- All 23 ALTER signatures cross-checked against pg_proc before apply.

**Committed** to branch chore/security-advisor-hardening @ 6259daa (NOT pushed): the two migration files (supabase/migrations/20260706240000_security_advisor_hardening.sql + .NOTES.md, both updated to reflect the FROM PUBLIC fix and APPLIED status), STATE.md, and the .claude/agents routing policy files. Owner PNGs and the claude.md case-dup were intentionally left untracked.

**Remaining advisor items (NOT addressed — need operator decision, they are dashboard/config toggles not migrations)**: auth_leaked_password_protection disabled; auth_insufficient_mfa_options. These are Supabase Auth settings, not SQL.

**Gates**: DB apply = operator-approved (done). Commit-to-branch = operator-approved (done). Push = NOT approved / NOT done.

---

## Session 2026-07-06 (latest) — Templates crash triage (RESOLVED, no code change)

**Task**: Investigate the /templates crash recorded in prior STATE.md (Digest 3798113376, hypothesized "missing budget_templates migration").

**Finding — DISPROVEN hypothesis; bug already fixed on main**:
- Crash was NOT a missing migration. It was an App-Router error: an inline onClick/confirm handler passed from a Server Component (TemplateCard in app/(protected)/templates/page.tsx).
- Already fixed on main by commit 2720163 "fix: move template delete action to client component", which extracted app/(protected)/templates/DeleteTemplateButton.tsx as a 'use client' component.
- Live Supabase DB (project renovation-job-costing = ivcwzvjdnaoecrsqwrhq) IS fully provisioned: budget_templates + template_items tables exist, RLS enabled, migration applied (version 20260706073239 "budget_templates"). Verified via Supabase MCP.

**Verification (both independent)**:
- next build: EXIT 0, compiled clean, 25/25 pages; /templates and /templates/[id] present as dynamic routes (113 kB First Load JS).
- repo-verifier-agent: overall PASS on all 5 sub-claims (server component has no DOM handlers; DeleteTemplateButton is 'use client' and owns delete logic; commit 2720163 present; [id]/page.tsx and actions.ts have no residual crash pattern; actions.ts queries budget_templates/template_items matching applied migration).
- Caveat: digest "3798113376" is not corroborated by any repo artifact (fix commit recorded digest 4076760219); digests are build-specific. Live-DB confirmation rests on the Supabase MCP check.

**State**: main @ 19ba991 (PR #20 merged). Working tree: only .claude/agents/* (routing policy) + STATE.md uncommitted. No product code changed. No commit/push (awaiting operator approval per CLAUDE.md gate).

**Note**: Prior entry's claim that /templates is a live bug is now OUTDATED — superseded by this entry.

---

## Session 2026-07-06 (later) — Top-5 polish on feature/top5-polish (PR #8 open, awaiting owner merge)

PR #8: feature/top5-polish → main. Commits: 5f74036 (polish + POSITIONING.md), 33d0c2b (8 DOM tests, @testing-library/react), ceea358 (G1R fixes: CSV sends only client-valid rows + skipped-count msg fixing silent $0 bug; print stamp moved out of print:hidden). Pipeline: G1R REJECT→fixed (2 MED), G2A APPROVED (8/8), verifier PASS, 61/61 tests, build clean. CI: primary Vercel preview SUCCESS; 3 failing statuses = stale duplicate Vercel projects (-6eum/-tbpt/-ohfs), config noise not code (owner should unlink). PREVIEW TESTED — all 5 features PASS on preview fuc35c3cg (ceea358). Non-blocking follow-ups: reduced-motion guard for csv-row-in; chart keyboard a11y; slider/number max mismatch (50 vs 100).

---

## Accomplished (verified — OVERALL PASS by independent verifier, 7/7 claims)

- Security: npm audit 0 vulns; next 15.5.7→15.5.20, postcss override in place (2a6d2a1).
- Build repair: restored 5 deps dropped in v2.0 merge (@tailwindcss/postcss, recharts, sonner, zod, tailwind-merge); build passes 35 routes.
- Tests repaired: 53/53 passing (was 12/41 dead), root cause vi.mock hoisting bug (7879204).
- RenoMargin iOS scaffolding (b4af625, pushed): Capacitor 8 shell in ios/, bundle ID com.torq.renomargin, live-server mode → vercel prod URL, plugins (Camera/Haptics/SplashScreen/StatusBar/App/Network), Info.plist permissions + ITSAppUsesNonExemptEncryption=false, icon/splash generated, web rebranded.

## Apple Account State

- DSA non-trader: Active
- Paid Apps Agreement: signed (Pending User Info)
- W-9: Active (Individual/Sole proprietor, Non-Exempt, SSN)
- Bank account: NOT added (Apple backend error — retry in a few hours)
- Apps in review:
  - NutriScan: iOS 1.0 Waiting for Review
  - TorqLens: iOS 1.0 Waiting for Review

## Next Actions

1. Create RenoMargin app record in App Store Connect
   - Bundle ID: com.torq.renomargin
   - SKU: renomargin-001

2. MacinCloud build session per IOS_BUILD_MACINCLOUD.md
   - Target: TestFlight internal "ME" group

3. Retry Apple bank account addition
   - Business page in Apple Developer

4. Before public release:
   - Implement in-app account deletion
   - Configure privacy labels
   - Prepare screenshots
   - Decide subscription model (web Stripe vs Apple IAP)

5. Commit .claude/agents + STATE.md
