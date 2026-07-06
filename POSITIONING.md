# RenoMargin — Positioning & App Store Copy

> Product name, tagline, and conversion copy. Source of truth for the App Store
> listing, landing page, and marketing. Feature copy doubles as the spec for
> in-app polish work (see git history: `feature/top5-polish`).

## Name & Tagline

**RenoMargin** — *"Every job. Every dollar. Zero surprises."*

Why it wins: "Reno" signals the niche (residential renovation — own the niche,
don't serve everyone), and "Margin" speaks the buyer's emotional language —
contractors don't dream about "job costing," they worry about protecting their
margin. Short, spellable over the phone, ownable.
(Runners-up considered: JobTally, CostCompass, TrueCost.)

## App Store

**Subtitle (30-char field):** `Know your margin, every job`

**Promotional text:**
> Know if every job is making money — while you can still do something about
> it. Built for renovation contractors who'd rather fix a budget on day 3 than
> argue about it at the final invoice.

**Full description:**

> **You don't lose money on renovation jobs all at once. You lose it $200 at a
> time — and find out when it's too late.**
>
> RenoMargin is job costing built for residential renovation contractors.
> Track estimated vs. actual costs on every job in real time, and get alerted
> the moment a project crosses your variance threshold — while there's still
> time to issue a change order instead of eating the overrun.
>
> **ESTIMATE IN MINUTES, NOT EVENINGS.** Turn your best past jobs into
> templates. Your next kitchen quote starts 90% done, priced from what work
> actually costs you — not industry averages.
>
> **SEE YOUR WHOLE BUSINESS AT A GLANCE.** One dashboard shows every active
> job's health, your top over-budget projects, and exactly where the money's
> going — materials, labor, or scope creep.
>
> **CATCH OVERRUNS EARLY.** Set your threshold once. RenoMargin watches every
> job and tells you the day it drifts — not the day you invoice.
>
> **WIN BIDS WITH ONE-CLICK REPORTS.** Client-ready PDF budgets that look like
> you paid $500/month for software. (You didn't.)
>
> **YOUR SPREADSHEETS ARE WELCOME HERE.** Import your existing CSVs in
> seconds. Export everything, anytime. Your data is never locked in.
>
> **Accurate by design. Private by default.** Every number is computed from
> your real cost ledger — your dashboard, alerts, and PDFs always agree. Your
> financial data is encrypted, isolated to your account, never sold, never
> used to train anything, and exportable the day you want it.
>
> Contractors switching from spreadsheets save hours per estimate. Contractors
> switching from Buildertrend save over $2,700 a year.
>
> **Try RenoMargin free for 14 days. Know your numbers before they know you.**

## Top 5 Features — strengthened copy (and polish spec)

### 1. Budget Templates — "Start every job with your hard-won knowledge"
Stop rebuilding the same kitchen estimate from scratch at 9pm. Turn your best
jobs into reusable templates — every line item, category, and labor rate — so
your next quote starts 90% done and reflects what work *actually* costs in
your market, not a guess.
- **Polish:** applied line items stagger in; estimate total counts up; toast:
  *"14 items added. You just skipped ~45 minutes of typing."*
- **Accuracy/privacy:** templates seed from real historical job data; private
  per account via Supabase RLS.

### 2. Dashboard Analytics — "Your whole business, in one glance before coffee"
Know exactly which jobs are making money and which are quietly bleeding it.
The Top-5 variance chart names problem jobs before they become problem
conversations; the category breakdown shows *where* the overrun lives.
- **Polish:** money figures count up on load; clicking a variance bar opens
  that job; threshold-crossing cards pulse once.
- **Accuracy/privacy:** all figures computed server-side from the cost ledger
  (same source as PDFs/exports); RLS-enforced visibility.

### 3. CSV Import/Export — "Your spreadsheet habit, upgraded — not confiscated"
Drop in a CSV and watch 50 line items land in seconds, with forgiving column
matching. Data walks out just as easily: one-click export, calculations
included. No lock-in, ever.
- **Polish:** live row validation — green checks cascade; problem rows flag
  amber with plain-English fixes; finish with *"23 of 23 rows imported ✓"*.
- **Accuracy/privacy:** row-level validation at the door; files parsed and
  discarded, never stored.

### 4. PDF Export — "Look like the biggest contractor in the room"
Turn any job into a clean, client-ready budget report in one click —
professional enough to sit next to a $500/month competitor's printout.
- **Polish/feature:** **Client version** (totals only) vs **Internal version**
  (full cost breakdown) toggle; generated-on date stamp.
- **Accuracy/privacy:** rendered from the same server-side figures as the
  dashboard; the client/internal split keeps labor rates and margins out of
  client documents by design.

### 5. Variance Alerts — "Find out on day 3, not at the final invoice"
Set your threshold once; the app watches every job's actuals against
estimates and tells you the moment a job crosses the line — while there's
still time to issue a change order.
- **Polish:** threshold slider with hindsight — *"At 10%, you'd have gotten
  3 alerts in the last 90 days."*
- **Accuracy/privacy:** exact ledger math (no sampling/ML in the alert path);
  alert emails carry job name + variance only, details behind login.
