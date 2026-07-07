// Pure helpers for account deletion, kept out of actions.ts because
// Next.js Server Action files ('use server') may only export async
// functions. Extracted here so this logic is unit-testable without
// mocking Supabase or Next internals.

/**
 * The typed confirmation must exactly equal the literal string 'DELETE'
 * (case-sensitive) or the user's own email.
 */
export function isDeletionConfirmed(input: string, email: string): boolean {
  if (!input) return false
  return input === 'DELETE' || input === email
}

/**
 * Ordered list of table deletes performed (via the admin/service-role
 * client, explicitly scoped by user id) after storage cleanup and before
 * the auth user itself is deleted. Exported so tests can assert ordering
 * without hitting a real database.
 *
 * jobs is deleted first because it CASCADEs away budget_versions,
 * change_orders, schedules, schedule_scenarios, tasks, task_changes and
 * scope_items (and therefore clears the NO ACTION FK columns below via
 * cascade rather than requiring the nulling updates in the common case).
 * The nulling updates are defensive belt-and-suspenders only — in this
 * app's single-owner-per-job model a user should never appear as
 * requested_by/approved_by/created_by/changed_by on another user's job.
 *
 * NOTE (atomicity tradeoff): these are separate supabase-js calls, not one
 * Postgres transaction. If a later step fails, earlier deletes are NOT
 * rolled back. True atomicity would require a Postgres RPC function
 * (a migration), which is out of scope for this change per operator
 * instruction ("no migrations"). The ordering below is chosen so that a
 * partial failure is always safe to re-run (deletes are idempotent —
 * re-deleting an already-deleted/absent row is a no-op) and never leaves
 * the auth user deleted while owned data still exists.
 */
export const DELETION_STEPS = [
  'jobs',
  'null_change_orders_requested_by',
  'null_change_orders_approved_by',
  'null_budget_versions_created_by',
  'null_schedules_created_by',
  'null_schedule_scenarios_created_by',
  'null_task_changes_changed_by',
  'budget_templates',
  'notification_preferences',
  'notification_queue',
  'notification_logs',
  'scope_item_photos',
  'photo_annotations',
  'auth_user',
] as const

export type DeletionStep = (typeof DELETION_STEPS)[number]
