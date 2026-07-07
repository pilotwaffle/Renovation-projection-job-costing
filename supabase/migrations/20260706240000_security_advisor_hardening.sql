-- ============================================================================
-- Migration: security_advisor_hardening
-- Date: 2026-07-06
-- Author: TORQ Builder (Sonnet 5), bounded task from operator
-- Status: APPLIED 2026-07-06 to project renovation-job-costing (ivcwzvjdnaoecrsqwrhq),
--         operator-approved, in two migrations: security_advisor_hardening (Section A +
--         initial Section B) and security_advisor_hardening_revoke_public (corrected Section B).
--         See NOTES.md. Verified: 0 functions without pinned search_path; anon EXECUTE = false
--         on all 8 SECURITY DEFINER photo functions (authenticated/service_role retained).
-- ============================================================================
--
-- PURPOSE
-- This migration remediates two Supabase Security Advisor WARN-level lints
-- for schema `public`, using surgical, reversible ALTER/REVOKE statements
-- only. No function bodies are re-declared (no CREATE OR REPLACE), and no
-- tables, RLS policies, or grants outside the scope below are touched.
--
-- ISSUE A — "Function Search Path Mutable" (WARN, 23 functions)
-- All 23 functions in `public` currently have no explicit `search_path`,
-- meaning it is resolved from the caller's role/session settings at call
-- time (mutable). The linter requires an explicit, immutable search_path.
--
--   Chosen value: SET search_path = public, pg_temp
--
-- Why not `search_path = ''` (fully empty)?
-- An empty search_path would force every unqualified object reference
-- inside a function body (tables, sequences, other functions, types) to
-- fail to resolve unless the body already fully schema-qualifies every
-- reference (e.g. `public.jobs` instead of `jobs`). This task does NOT
-- include auditing or editing function bodies, so we cannot verify that
-- all 23 bodies are fully schema-qualified. Using `public, pg_temp`
-- satisfies the linter (search_path is now explicitly pinned and no
-- longer inherited/mutable from the caller) while preserving the exact
-- name resolution behavior the functions already rely on today. This is
-- the safe, non-breaking choice.
--
-- ISSUE B — "SECURITY DEFINER function executable by anon" (WARN, 8 functions)
-- The 8 SECURITY DEFINER photo-related functions run with the privileges of
-- their owner (bypassing RLS), so allowing unauthenticated (`anon`) callers to
-- execute them is a privilege-escalation exposure.
--
-- IMPORTANT: `anon` receives EXECUTE via the default PUBLIC grant (ACL entry
-- `=X/postgres`), NOT via a direct grant to the `anon` role. Therefore
-- `REVOKE EXECUTE ... FROM anon` is a NO-OP (the PUBLIC grant still applies).
-- The correct fix is `REVOKE EXECUTE ... FROM PUBLIC`, which strips the blanket
-- grant. `authenticated` and `service_role` keep their own explicit grants, so
-- the application (signed-in users) and server-side calls are unaffected.
--
-- SCOPE / GUARANTEES
--   - No CREATE, DROP, or CREATE OR REPLACE statements.
--   - No changes to function bodies, tables, RLS, or policies.
--   - ALTER FUNCTION ... SET search_path is naturally idempotent (safe to
--     re-run).
--   - REVOKE EXECUTE ... FROM anon is safe to re-run (no-op if already
--     revoked).
--   - Rollback statements are documented in the companion NOTES.md file.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Section A: pin search_path on all 23 public functions
-- ----------------------------------------------------------------------------

-- SECURITY DEFINER photo functions (8) — also covered in Section B below
ALTER FUNCTION public.cleanup_orphaned_photos() SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_photo_path(p_user_id uuid, p_job_id uuid, p_scope_item_id uuid, p_file_name text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_job_photo_stats(p_job_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_scope_item_photos(p_scope_item_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.has_photo_access(p_photo_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.pair_before_after_photos(p_before_photo_id uuid, p_after_photo_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.photo_storage_stats() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_primary_photo(p_photo_id uuid) SET search_path = public, pg_temp;

-- Remaining 15 functions (search_path only, no SECURITY DEFINER / anon revoke)
ALTER FUNCTION public.calculate_budget_totals(budget_version_uuid uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.calculate_critical_path(schedule_uuid uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.calculate_template_total(template_uuid uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.calculate_variance(scope_item_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.check_resource_conflicts(p_resource_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone, p_exclude_task_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.check_variance_alerts(p_job_id uuid, p_budget_version_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_or_create_notification_preferences(p_user_id uuid, p_email_address text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_project_timeline_summary(job_uuid uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.queue_daily_summaries() SET search_path = public, pg_temp;
ALTER FUNCTION public.queue_notification(p_user_id uuid, p_job_id uuid, p_notification_type text, p_context_data jsonb, p_priority integer, p_scheduled_at timestamp with time zone) SET search_path = public, pg_temp;
ALTER FUNCTION public.queue_weekly_summaries() SET search_path = public, pg_temp;
ALTER FUNCTION public.trigger_variance_check() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_budget_template_timestamp() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_parent_task_progress() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;


-- ----------------------------------------------------------------------------
-- Section B: revoke PUBLIC EXECUTE on SECURITY DEFINER photo functions
-- ----------------------------------------------------------------------------
-- Revoked from PUBLIC (not anon) — see Issue B note above. `authenticated` and
-- `service_role` retain their own explicit EXECUTE grants, so signed-in app
-- users and server-side calls are unaffected; only `anon` loses access.

REVOKE EXECUTE ON FUNCTION public.cleanup_orphaned_photos() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_photo_path(p_user_id uuid, p_job_id uuid, p_scope_item_id uuid, p_file_name text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_job_photo_stats(p_job_id uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_scope_item_photos(p_scope_item_id uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_photo_access(p_photo_id uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pair_before_after_photos(p_before_photo_id uuid, p_after_photo_id uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.photo_storage_stats() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_primary_photo(p_photo_id uuid) FROM PUBLIC;

-- ============================================================================
-- End of migration
-- ============================================================================
