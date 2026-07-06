# Archived migrations — DO NOT APPLY

Files in this folder are superseded drafts kept for history only. They are
outside the active migration path and must never be applied to any database.

| File | Superseded by | Why |
|---|---|---|
| `002_notification_system.sql` | `20250125000000_notifications.sql` | The timestamped file is a strict superset: identical tables (with `IF NOT EXISTS` guards), an enhanced `check_variance_alerts` (job/client names in context, sorted milestone iteration), added `queue_daily_summaries` / `queue_weekly_summaries` (required by the deployed edge functions), GRANTs for `authenticated`/`service_role`, and full idempotency guards. The draft's unguarded `CREATE TABLE`/`CREATE POLICY`/`CREATE TRIGGER` statements would error against a database where the final version has run. |
