import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---- Shared mocks -----------------------------------------------------------

const mockGetUser = vi.fn()
const mockSignOut = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
      signOut: mockSignOut,
    },
  })),
}))

const mockCreateAdminClient = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: (...args: unknown[]) => mockCreateAdminClient(...args),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

const mockRedirect = vi.fn((path: string) => {
  // Mirror Next's real behavior of throwing to halt execution, so the
  // server action's control flow after redirect() is also exercised the
  // same way it would be in production.
  const err = new Error(`NEXT_REDIRECT:${path}`) as Error & { digest: string }
  err.digest = `NEXT_REDIRECT;push;${path}`
  throw err
})
vi.mock('next/navigation', () => ({
  redirect: (...args: [string]) => mockRedirect(...args),
}))

import {
  isDeletionConfirmed,
  DELETION_STEPS,
} from '../app/(protected)/settings/account/deletion-rules'
import { deleteAccountAction } from '../app/(protected)/settings/account/actions'

beforeEach(() => {
  vi.clearAllMocks()
})

// ---- isDeletionConfirmed -----------------------------------------------------

describe('isDeletionConfirmed', () => {
  const email = 'owner@example.com'

  it('returns false for an empty string', () => {
    expect(isDeletionConfirmed('', email)).toBe(false)
  })

  it('returns false for lowercase "delete"', () => {
    expect(isDeletionConfirmed('delete', email)).toBe(false)
  })

  it('returns false for mixed-case "Delete"', () => {
    expect(isDeletionConfirmed('Delete', email)).toBe(false)
  })

  it('returns false for the wrong email', () => {
    expect(isDeletionConfirmed('someone-else@example.com', email)).toBe(false)
  })

  it('returns true for the exact literal "DELETE"', () => {
    expect(isDeletionConfirmed('DELETE', email)).toBe(true)
  })

  it('returns true for the exact account email', () => {
    expect(isDeletionConfirmed(email, email)).toBe(true)
  })
})

// ---- DELETION_STEPS ordering --------------------------------------------------

describe('DELETION_STEPS ordering', () => {
  it('deletes jobs before the notification/template tables', () => {
    const jobsIndex = DELETION_STEPS.indexOf('jobs')
    const templatesIndex = DELETION_STEPS.indexOf('budget_templates')
    const prefsIndex = DELETION_STEPS.indexOf('notification_preferences')
    const queueIndex = DELETION_STEPS.indexOf('notification_queue')
    const logsIndex = DELETION_STEPS.indexOf('notification_logs')

    expect(jobsIndex).toBeGreaterThanOrEqual(0)
    expect(jobsIndex).toBeLessThan(templatesIndex)
    expect(jobsIndex).toBeLessThan(prefsIndex)
    expect(jobsIndex).toBeLessThan(queueIndex)
    expect(jobsIndex).toBeLessThan(logsIndex)
  })

  it('deletes jobs before the auth user, and the auth user is last', () => {
    const jobsIndex = DELETION_STEPS.indexOf('jobs')
    const authIndex = DELETION_STEPS.indexOf('auth_user')

    expect(authIndex).toBe(DELETION_STEPS.length - 1)
    expect(jobsIndex).toBeLessThan(authIndex)
  })
})

// ---- deleteAccountAction: authentication guard --------------------------------

describe('deleteAccountAction - authentication guard', () => {
  it('refuses when unauthenticated and does not call the admin client', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const result = await deleteAccountAction('DELETE')

    expect(result).toEqual({ error: 'Not authenticated' })
    expect(mockCreateAdminClient).not.toHaveBeenCalled()
    expect(mockRedirect).not.toHaveBeenCalled()
  })
})

// ---- deleteAccountAction: confirmation guard -----------------------------------

describe('deleteAccountAction - confirmation guard', () => {
  it('refuses when the confirmation string does not match and calls no delete', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'owner@example.com' } },
      error: null,
    })

    const result = await deleteAccountAction('not-a-match')

    expect(result?.error).toMatch(/did not match/i)
    expect(mockCreateAdminClient).not.toHaveBeenCalled()
    expect(mockRedirect).not.toHaveBeenCalled()
  })
})

// ---- deleteAccountAction: missing service role key ------------------------------

describe('deleteAccountAction - service key missing', () => {
  it('returns a friendly error without leaking the key name', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'owner@example.com' } },
      error: null,
    })
    mockCreateAdminClient.mockImplementation(() => {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
    })

    const result = await deleteAccountAction('DELETE')

    expect(result?.error).toMatch(/not configured on the server/i)
    expect(result?.error).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/)
    expect(mockRedirect).not.toHaveBeenCalled()
  })
})

// ---- deleteAccountAction: full happy path (storage + DB + auth mocked) ----------

describe('deleteAccountAction - happy path', () => {
  function buildAdminClientMock() {
    const deletedTables: string[] = []
    const updatedTables: string[] = []

    const from = vi.fn((table: string) => ({
      delete: () => ({
        eq: vi.fn(() => {
          deletedTables.push(table)
          return Promise.resolve({ error: null })
        }),
      }),
      update: () => ({
        eq: vi.fn(() => {
          updatedTables.push(table)
          return Promise.resolve({ error: null })
        }),
      }),
    }))

    const list = vi.fn().mockResolvedValue({ data: [], error: null })
    const remove = vi.fn().mockResolvedValue({ error: null })
    const deleteUser = vi.fn().mockResolvedValue({ error: null })

    return {
      from,
      storage: { from: () => ({ list, remove }) },
      auth: { admin: { deleteUser } },
      _spies: { list, remove, deleteUser, deletedTables, updatedTables },
    }
  }

  it('performs storage cleanup, ordered DB deletes, deletes the auth user, signs out, and redirects to /goodbye', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'owner@example.com' } },
      error: null,
    })

    const adminMock = buildAdminClientMock()
    mockCreateAdminClient.mockReturnValue(adminMock)

    await expect(deleteAccountAction('DELETE')).rejects.toThrow('NEXT_REDIRECT')

    expect(adminMock._spies.list).toHaveBeenCalled()
    expect(adminMock._spies.deleteUser).toHaveBeenCalledWith('user-1')
    expect(adminMock._spies.deletedTables).toContain('jobs')
    expect(adminMock._spies.deletedTables.indexOf('jobs')).toBeLessThan(
      adminMock._spies.deletedTables.indexOf('budget_templates')
    )
    expect(mockSignOut).toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith('/goodbye')
  })

  it('paginates independently per folder level, collecting every object across multiple pages at the top level and inside a nested folder (no skips)', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'owner@example.com' } },
      error: null,
    })

    const adminMock = buildAdminClientMock()

    // Top level ("user-1"): 100 files on page 1 (offset 0), then a folder
    // entry "sub" plus 1 more file on page 2 (offset 100) — 101 top-level
    // file paths total, plus the "sub" folder to recurse into.
    const topPage1 = Array.from({ length: 100 }, (_, i) => ({
      name: `top-${i}.jpg`,
      id: `file-top-${i}`,
      metadata: {},
    }))
    const topPage2 = [
      { name: 'sub', id: null, metadata: null },
      { name: 'top-100.jpg', id: 'file-top-100', metadata: {} },
    ]

    // Nested folder ("user-1/sub"): also spans two pages — 100 files on
    // page 1 (offset 0), then 1 more file on page 2 (offset 100).
    const subPage1 = Array.from({ length: 100 }, (_, i) => ({
      name: `sub-${i}.jpg`,
      id: `file-sub-${i}`,
      metadata: {},
    }))
    const subPage2 = [{ name: 'sub-100.jpg', id: 'file-sub-100', metadata: {} }]

    const list = vi.fn(
      (prefix: string, opts: { limit: number; offset: number }) => {
        if (prefix === 'user-1') {
          if (opts.offset === 0) return Promise.resolve({ data: topPage1, error: null })
          if (opts.offset === 100) return Promise.resolve({ data: topPage2, error: null })
          return Promise.resolve({ data: [], error: null })
        }
        if (prefix === 'user-1/sub') {
          if (opts.offset === 0) return Promise.resolve({ data: subPage1, error: null })
          if (opts.offset === 100) return Promise.resolve({ data: subPage2, error: null })
          return Promise.resolve({ data: [], error: null })
        }
        return Promise.resolve({ data: [], error: null })
      }
    )
    const remove = vi.fn().mockResolvedValue({ error: null })
    adminMock.storage.from = () => ({ list, remove })
    mockCreateAdminClient.mockReturnValue(adminMock)

    await expect(deleteAccountAction('DELETE')).rejects.toThrow('NEXT_REDIRECT')

    expect(remove).toHaveBeenCalledTimes(1)
    const removedPaths: string[] = remove.mock.calls[0][0]

    const expectedTopPaths = [
      ...topPage1.map((e) => `user-1/${e.name}`),
      'user-1/top-100.jpg',
    ]
    const expectedSubPaths = [
      ...subPage1.map((e) => `user-1/sub/${e.name}`),
      'user-1/sub/sub-100.jpg',
    ]

    expect(removedPaths).toHaveLength(expectedTopPaths.length + expectedSubPaths.length)
    for (const p of expectedTopPaths) {
      expect(removedPaths).toContain(p)
    }
    for (const p of expectedSubPaths) {
      expect(removedPaths).toContain(p)
    }
  })

  it('aborts before DB/auth deletion when storage removal hard-fails', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'owner@example.com' } },
      error: null,
    })

    const adminMock = buildAdminClientMock()
    adminMock.storage.from = () => ({
      list: vi.fn().mockResolvedValue({
        data: [{ name: 'photo.jpg', id: 'file-1', metadata: {} }],
        error: null,
      }),
      remove: vi.fn().mockResolvedValue({ error: { message: 'storage down' } }),
    })
    mockCreateAdminClient.mockReturnValue(adminMock)

    const result = await deleteAccountAction('DELETE')

    expect(result?.error).toMatch(/could not delete account files/i)
    expect(adminMock.from).not.toHaveBeenCalled()
    expect(adminMock.auth.admin.deleteUser).not.toHaveBeenCalled()
    expect(mockRedirect).not.toHaveBeenCalled()
  })
})
