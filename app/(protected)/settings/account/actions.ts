'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isDeletionConfirmed, type DeletionStep } from './deletion-rules'

const SCOPE_ITEM_PHOTOS_BUCKET = 'scope-item-photos'

export interface DeleteAccountResult {
  error?: string
}

async function listAllStorageObjectPaths(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<{ paths: string[]; error?: string }> {
  const paths: string[] = []
  const pageSize = 100

  // Recursively walk the user's storage prefix. Objects live at
  // <user_id>/... and may be nested under further subfolders (e.g. per
  // scope item), so we walk directories as well as files.
  async function walk(prefix: string): Promise<string | undefined> {
    // `offset` is local to each walk() call/recursion level so that
    // paginating a nested folder never shares (and thus never disturbs)
    // the parent folder's pagination cursor.
    let offset = 0
    for (;;) {
      const { data, error } = await admin.storage
        .from(SCOPE_ITEM_PHOTOS_BUCKET)
        .list(prefix, {
          limit: pageSize,
          offset,
          sortBy: { column: 'name', order: 'asc' },
        })

      if (error) {
        return error.message
      }

      if (!data || data.length === 0) {
        break
      }

      for (const entry of data) {
        const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name
        // Storage API returns folder placeholder entries with id/metadata
        // set to null at runtime (the JS types don't mark them nullable,
        // hence the `as unknown` cast); treat those as directories to
        // recurse into rather than files to remove.
        const isFolder =
          (entry as unknown as { id: string | null }).id === null &&
          (entry as unknown as { metadata: unknown }).metadata === null
        if (isFolder) {
          const err = await walk(fullPath)
          if (err) return err
        } else {
          paths.push(fullPath)
        }
      }

      if (data.length < pageSize) {
        break
      }
      offset += pageSize
    }
    return undefined
  }

  const walkError = await walk(userId)
  if (walkError) {
    return { paths, error: walkError }
  }
  return { paths }
}

/**
 * Deletes a user's account and all owned data: storage objects first,
 * then database rows (ordered per DELETION_STEPS), then the auth user
 * itself. Returns { error } on any non-redirect failure so the caller UI
 * can render it. On success this function redirects and does not return.
 */
export async function deleteAccountAction(
  confirmation: string
): Promise<DeleteAccountResult> {
  const supabase = await createClient()

  // Step A: authenticate the caller.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Not authenticated' }
  }

  const userId = user.id
  const email = user.email ?? ''

  // Step B: confirmation guard (defense in depth — the UI also gates this).
  // Re-authentication is intentionally NOT required here (operator decision):
  // a typed "DELETE"/email confirmation is an accepted App Store 5.1.1(v)
  // pattern and avoids breaking OAuth-only users who have no password.
  if (!isDeletionConfirmed(confirmation, email)) {
    return { error: 'Confirmation text did not match. Account was not deleted.' }
  }

  // Step C: build the admin client. Fail safe if the service role key is
  // not configured on this environment.
  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch {
    return {
      error:
        'Account deletion is not configured on the server. Please contact support.',
    }
  }

  try {
    // Step D: storage cleanup FIRST. Abort before touching the database or
    // auth user if storage removal hard-fails, so we never orphan files.
    const { paths, error: listError } = await listAllStorageObjectPaths(
      admin,
      userId
    )

    if (listError) {
      console.error('Account deletion: storage listing failed', listError)
      return {
        error: 'Could not verify account files for deletion. Please try again.',
      }
    }

    if (paths.length > 0) {
      const { error: removeError } = await admin.storage
        .from(SCOPE_ITEM_PHOTOS_BUCKET)
        .remove(paths)

      if (removeError) {
        console.error('Account deletion: storage removal failed', removeError)
        return {
          error: 'Could not delete account files. Please try again.',
        }
      }
    }

    // Step E: ordered DB deletion via the admin client (bypasses RLS —
    // every call below is explicitly scoped to this user's id).
    const { error: jobsError } = await admin
      .from('jobs')
      .delete()
      .eq('user_id', userId)
    if (jobsError) {
      console.error('Account deletion: failed at step "jobs"', jobsError)
      return { error: 'Failed to delete account data (jobs). Please try again.' }
    }

    const nullOutSteps: Array<{
      step: DeletionStep
      table: string
      column: string
    }> = [
      { step: 'null_change_orders_requested_by', table: 'change_orders', column: 'requested_by' },
      { step: 'null_change_orders_approved_by', table: 'change_orders', column: 'approved_by' },
      { step: 'null_budget_versions_created_by', table: 'budget_versions', column: 'created_by' },
      { step: 'null_schedules_created_by', table: 'schedules', column: 'created_by' },
      { step: 'null_schedule_scenarios_created_by', table: 'schedule_scenarios', column: 'created_by' },
      { step: 'null_task_changes_changed_by', table: 'task_changes', column: 'changed_by' },
    ]

    for (const { step, table, column } of nullOutSteps) {
      const { error } = await admin
        .from(table)
        .update({ [column]: null })
        .eq(column, userId)
      if (error) {
        console.error(`Account deletion: failed at step "${step}"`, error)
        return { error: `Failed to delete account data (${step}). Please try again.` }
      }
    }

    const deleteByUserIdSteps: Array<{ step: DeletionStep; table: string }> = [
      { step: 'budget_templates', table: 'budget_templates' },
      { step: 'notification_preferences', table: 'notification_preferences' },
      { step: 'notification_queue', table: 'notification_queue' },
      { step: 'notification_logs', table: 'notification_logs' },
      { step: 'scope_item_photos', table: 'scope_item_photos' },
      { step: 'photo_annotations', table: 'photo_annotations' },
    ]

    for (const { step, table } of deleteByUserIdSteps) {
      const { error } = await admin.from(table).delete().eq('user_id', userId)
      if (error) {
        console.error(`Account deletion: failed at step "${step}"`, error)
        return { error: `Failed to delete account data (${step}). Please try again.` }
      }
    }

    // Step F: delete the auth user last.
    const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId)
    if (deleteUserError) {
      console.error('Account deletion: failed at step "auth_user"', deleteUserError)
      return { error: 'Failed to delete your account. Please try again.' }
    }
  } catch (err) {
    console.error('Account deletion: unexpected error', err)
    return { error: 'An unexpected error occurred while deleting your account.' }
  }

  // Sign out the caller's own session, then redirect.
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/goodbye')
}
