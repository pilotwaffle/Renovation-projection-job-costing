// SERVER ONLY — never import into a client component.
// This module reads SUPABASE_SERVICE_ROLE_KEY, which must never be exposed
// to the browser. It bypasses Row Level Security, so every caller MUST
// scope its own queries explicitly (e.g. .eq('user_id', userId)).
//
// NOTE: the 'server-only' package is not present in node_modules for this
// project, so we rely on this file only ever being imported from server
// actions / route handlers (never from a 'use client' component) rather
// than a build-time guard. Do not add a client-side import of this module.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Builds a Supabase client authenticated with the service-role key.
 * Intended for use only from server actions / route handlers that need to
 * bypass RLS for privileged operations (e.g. account deletion).
 *
 * Throws if SUPABASE_SERVICE_ROLE_KEY is not configured so callers fail
 * safe instead of silently falling back to an unauthenticated client.
 */
export function createAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
