# Notes: 20260706240000_security_advisor_hardening.sql

STATUS: APPLIED 2026-07-06 to project renovation-job-costing (ref
`ivcwzvjdnaoecrsqwrhq`), operator-approved. Applied as two migrations:
`security_advisor_hardening` (Section A + an initial no-op Section B against `anon`)
and `security_advisor_hardening_revoke_public` (corrected Section B, revoking from
`PUBLIC`). Post-apply verification: 0 public functions without a pinned search_path;
`anon` EXECUTE = false on all 8 SECURITY DEFINER photo functions, with
`authenticated` and `service_role` retained.

## What this migration does

Fixes two Supabase Security Advisor WARN-level lints in schema `public`:

- **Issue A — Function Search Path Mutable**: pins `search_path = public, pg_temp`
  on all 23 functions listed below (instead of the fully-empty `''`, to avoid
  breaking unqualified object references inside function bodies that were not
  audited as part of this task).
- **Issue B — SECURITY DEFINER executable by anon**: revokes `EXECUTE` from
  `PUBLIC` on the 8 SECURITY DEFINER photo functions listed below. (`anon`'s
  access came from the default PUBLIC grant, so revoking `FROM anon` is a no-op;
  `FROM PUBLIC` is the effective fix.) `authenticated` and `service_role` keep
  their explicit `EXECUTE` grants and are unchanged.

No `CREATE`, `DROP`, or `CREATE OR REPLACE` statements are used. No function
bodies, tables, RLS, or policies are modified.

## Functions touched

### Section A — search_path pinned (23 total)

SECURITY DEFINER (also in Section B, 8):
1. `cleanup_orphaned_photos()`
2. `generate_photo_path(p_user_id uuid, p_job_id uuid, p_scope_item_id uuid, p_file_name text)`
3. `get_job_photo_stats(p_job_id uuid)`
4. `get_scope_item_photos(p_scope_item_id uuid)`
5. `has_photo_access(p_photo_id uuid)`
6. `pair_before_after_photos(p_before_photo_id uuid, p_after_photo_id uuid)`
7. `photo_storage_stats()`
8. `set_primary_photo(p_photo_id uuid)`

Non-SECURITY-DEFINER (search_path only, 15):
9. `calculate_budget_totals(budget_version_uuid uuid)`
10. `calculate_critical_path(schedule_uuid uuid)`
11. `calculate_template_total(template_uuid uuid)`
12. `calculate_variance(scope_item_id uuid)`
13. `check_resource_conflicts(p_resource_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone, p_exclude_task_id uuid)`
14. `check_variance_alerts(p_job_id uuid, p_budget_version_id uuid)`
15. `get_or_create_notification_preferences(p_user_id uuid, p_email_address text)`
16. `get_project_timeline_summary(job_uuid uuid)`
17. `queue_daily_summaries()`
18. `queue_notification(p_user_id uuid, p_job_id uuid, p_notification_type text, p_context_data jsonb, p_priority integer, p_scheduled_at timestamp with time zone)`
19. `queue_weekly_summaries()`
20. `trigger_variance_check()`
21. `update_budget_template_timestamp()`
22. `update_parent_task_progress()`
23. `update_updated_at_column()`

### Section B — anon EXECUTE revoked (8 total)

Same 8 SECURITY DEFINER functions listed above (#1–#8).

## Rollback

To fully reverse this migration, run the following (in a new migration file,
not by editing this one):

```sql
-- Reverse Section A: reset search_path to default (role-mutable) on all 23 functions
ALTER FUNCTION public.cleanup_orphaned_photos() RESET search_path;
ALTER FUNCTION public.generate_photo_path(p_user_id uuid, p_job_id uuid, p_scope_item_id uuid, p_file_name text) RESET search_path;
ALTER FUNCTION public.get_job_photo_stats(p_job_id uuid) RESET search_path;
ALTER FUNCTION public.get_scope_item_photos(p_scope_item_id uuid) RESET search_path;
ALTER FUNCTION public.has_photo_access(p_photo_id uuid) RESET search_path;
ALTER FUNCTION public.pair_before_after_photos(p_before_photo_id uuid, p_after_photo_id uuid) RESET search_path;
ALTER FUNCTION public.photo_storage_stats() RESET search_path;
ALTER FUNCTION public.set_primary_photo(p_photo_id uuid) RESET search_path;
ALTER FUNCTION public.calculate_budget_totals(budget_version_uuid uuid) RESET search_path;
ALTER FUNCTION public.calculate_critical_path(schedule_uuid uuid) RESET search_path;
ALTER FUNCTION public.calculate_template_total(template_uuid uuid) RESET search_path;
ALTER FUNCTION public.calculate_variance(scope_item_id uuid) RESET search_path;
ALTER FUNCTION public.check_resource_conflicts(p_resource_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone, p_exclude_task_id uuid) RESET search_path;
ALTER FUNCTION public.check_variance_alerts(p_job_id uuid, p_budget_version_id uuid) RESET search_path;
ALTER FUNCTION public.get_or_create_notification_preferences(p_user_id uuid, p_email_address text) RESET search_path;
ALTER FUNCTION public.get_project_timeline_summary(job_uuid uuid) RESET search_path;
ALTER FUNCTION public.queue_daily_summaries() RESET search_path;
ALTER FUNCTION public.queue_notification(p_user_id uuid, p_job_id uuid, p_notification_type text, p_context_data jsonb, p_priority integer, p_scheduled_at timestamp with time zone) RESET search_path;
ALTER FUNCTION public.queue_weekly_summaries() RESET search_path;
ALTER FUNCTION public.trigger_variance_check() RESET search_path;
ALTER FUNCTION public.update_budget_template_timestamp() RESET search_path;
ALTER FUNCTION public.update_parent_task_progress() RESET search_path;
ALTER FUNCTION public.update_updated_at_column() RESET search_path;

-- Reverse Section B: restore the PUBLIC EXECUTE grant on the 8 SECURITY DEFINER photo functions
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_photos() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_photo_path(p_user_id uuid, p_job_id uuid, p_scope_item_id uuid, p_file_name text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_job_photo_stats(p_job_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_scope_item_photos(p_scope_item_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_photo_access(p_photo_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.pair_before_after_photos(p_before_photo_id uuid, p_after_photo_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.photo_storage_stats() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_primary_photo(p_photo_id uuid) TO PUBLIC;
```

## Reminder

This migration file is **NOT YET APPLIED**. It has been authored on disk only.
Applying it (via `apply_migration` or otherwise) requires explicit operator
approval.
