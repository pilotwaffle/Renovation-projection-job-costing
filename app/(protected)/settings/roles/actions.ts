'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { rbacService } from '@/lib/services/rbacService'
import type {
  RoleAssignmentParams,
  BulkRoleAssignmentParams,
  RoleName,
  Role,
  Permission,
  UserRole,
  JobRoleAssignment
} from '@/lib/types'

/**
 * Server Actions for RBAC (Role-Based Access Control)
 * These actions provide server-side functionality for managing roles and permissions
 */

const supabase = createClient()

/**
 * Assign a role to a user
 */
export async function assignRoleAction(params: RoleAssignmentParams) {
  try {
    // Get current user for audit trail
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Check if current user has permission to assign roles
    const canAssignRoles = await rbacService.hasPermission({
      permission: 'users.manage',
      user_id: user.id
    })

    if (!canAssignRoles) {
      return { success: false, error: 'Insufficient permissions' }
    }

    const success = await rbacService.assignRole(params, user.id)

    if (success) {
      revalidatePath('/settings/roles')
      revalidatePath('/dashboard')
      return { success: true }
    } else {
      return { success: false, error: 'Failed to assign role' }
    }
  } catch (error) {
    console.error('Error assigning role:', error)
    return { success: false, error: 'Internal server error' }
  }
}

/**
 * Remove a role from a user
 */
export async function removeRoleAction(
  userId: string,
  roleId: string,
  jobId?: string
) {
  try {
    // Get current user for audit trail
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Check if current user has permission to manage roles
    const canManageRoles = await rbacService.hasPermission({
      permission: 'users.manage',
      user_id: user.id
    })

    if (!canManageRoles) {
      return { success: false, error: 'Insufficient permissions' }
    }

    // Get role details to check hierarchy
    const targetRole = await rbacService.getRole(roleId)
    if (!targetRole) {
      return { success: false, error: 'Role not found' }
    }

    const success = await rbacService.removeRole(userId, roleId, jobId)

    if (success) {
      revalidatePath('/settings/roles')
      revalidatePath('/dashboard')
      revalidatePath(`/jobs/${jobId}`)
      return { success: true }
    } else {
      return { success: false, error: 'Failed to remove role' }
    }
  } catch (error) {
    console.error('Error removing role:', error)
    return { success: false, error: 'Internal server error' }
  }
}

/**
 * Bulk assign roles to users for a job
 */
export async function bulkAssignJobRolesAction(params: BulkRoleAssignmentParams) {
  try {
    // Get current user for audit trail
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Check if current user can manage the job
    const canManageJob = await rbacService.hasPermission({
      permission: 'jobs.assign_roles',
      job_id: params.job_id,
      user_id: user.id
    })

    if (!canManageJob) {
      return { success: false, error: 'Insufficient permissions to manage job roles' }
    }

    const success = await rbacService.bulkAssignJobRoles(params)

    if (success) {
      revalidatePath(`/jobs/${params.job_id}`)
      revalidatePath('/settings/roles')
      return { success: true }
    } else {
      return { success: false, error: 'Failed to bulk assign roles' }
    }
  } catch (error) {
    console.error('Error bulk assigning job roles:', error)
    return { success: false, error: 'Internal server error' }
  }
}

/**
 * Get all available roles
 */
export async function getRolesAction(): Promise<{ success: boolean; data?: Role[]; error?: string }> {
  try {
    const roles = await rbacService.getRoles()
    return { success: true, data: roles }
  } catch (error) {
    console.error('Error getting roles:', error)
    return { success: false, error: 'Failed to fetch roles' }
  }
}

/**
 * Get role by ID
 */
export async function getRoleAction(roleId: string): Promise<{ success: boolean; data?: Role | null; error?: string }> {
  try {
    const role = await rbacService.getRole(roleId)
    return { success: true, data: role }
  } catch (error) {
    console.error('Error getting role:', error)
    return { success: false, error: 'Failed to fetch role' }
  }
}

/**
 * Get role permissions
 */
export async function getRolePermissionsAction(roleId: string): Promise<{ success: boolean; data?: Permission[]; error?: string }> {
  try {
    const permissions = await rbacService.getRolePermissions(roleId)
    return { success: true, data: permissions }
  } catch (error) {
    console.error('Error getting role permissions:', error)
    return { success: false, error: 'Failed to fetch role permissions' }
  }
}

/**
 * Get user with roles
 */
export async function getUserWithRolesAction(userId?: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const userWithRoles = await rbacService.getUserWithRoles(userId)
    return { success: true, data: userWithRoles }
  } catch (error) {
    console.error('Error getting user with roles:', error)
    return { success: false, error: 'Failed to fetch user roles' }
  }
}

/**
 * Get job role assignments
 */
export async function getJobRoleAssignmentsAction(jobId: string): Promise<{ success: boolean; data?: JobRoleAssignment[]; error?: string }> {
  try {
    const assignments = await rbacService.getJobRoleAssignments(jobId)
    return { success: true, data: assignments }
  } catch (error) {
    console.error('Error getting job role assignments:', error)
    return { success: false, error: 'Failed to fetch job role assignments' }
  }
}

/**
 * Check if user has specific permission
 */
export async function checkPermissionAction(params: {
  permission: string
  jobId?: string
  userId?: string
}): Promise<{ success: boolean; hasPermission?: boolean; error?: string }> {
  try {
    const hasPermission = await rbacService.hasPermission(params)
    return { success: true, hasPermission }
  } catch (error) {
    console.error('Error checking permission:', error)
    return { success: false, error: 'Failed to check permission' }
  }
}

/**
 * Check if user has specific role
 */
export async function checkRoleAction(params: {
  roleName: RoleName
  jobId?: string
  userId?: string
}): Promise<{ success: boolean; hasRole?: boolean; error?: string }> {
  try {
    const hasRole = await rbacService.hasRole(params.roleName, params.jobId, params.userId)
    return { success: true, hasRole }
  } catch (error) {
    console.error('Error checking role:', error)
    return { success: false, error: 'Failed to check role' }
  }
}

/**
 * Get user permissions
 */
export async function getUserPermissionsAction(
  userId?: string,
  jobId?: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const permissions = await rbacService.getUserPermissions(userId, jobId)
    return { success: true, data: permissions }
  } catch (error) {
    console.error('Error getting user permissions:', error)
    return { success: false, error: 'Failed to fetch user permissions' }
  }
}

/**
 * Get assignable roles for current user
 */
export async function getAssignableRolesAction(currentUserId?: string): Promise<{ success: boolean; data?: Role[]; error?: string }> {
  try {
    const roles = await rbacService.getAssignableRoles(currentUserId)
    return { success: true, data: roles }
  } catch (error) {
    console.error('Error getting assignable roles:', error)
    return { success: false, error: 'Failed to fetch assignable roles' }
  }
}

/**
 * Middleware function to check permissions before proceeding
 */
export async function requirePermissionAction(
  permission: string,
  jobId?: string,
  redirectTo?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    const hasPermission = await rbacService.hasPermission({
      permission,
      job_id: jobId,
      user_id: user.id
    })

    if (!hasPermission) {
      return { success: false, error: 'Insufficient permissions' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error checking required permission:', error)
    return { success: false, error: 'Internal server error' }
  }
}

/**
 * Middleware function to check role before proceeding
 */
export async function requireRoleAction(
  roleName: RoleName,
  jobId?: string,
  redirectTo?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    const hasRole = await rbacService.hasRole(roleName, jobId, user.id)

    if (!hasRole) {
      return { success: false, error: 'Insufficient role privileges' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error checking required role:', error)
    return { success: false, error: 'Internal server error' }
  }
}

/**
 * Create a new job with initial role assignments
 */
export async function createJobWithRolesAction(params: {
  jobData: any
  initialAssignments?: Array<{
    userId: string
    roleId: string
  }>
}): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Check if user can create jobs
    const canCreateJob = await rbacService.hasPermission({
      permission: 'jobs.create',
      user_id: user.id
    })

    if (!canCreateJob) {
      return { success: false, error: 'Insufficient permissions to create jobs' }
    }

    // Create the job (using existing job creation logic)
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        ...params.jobData,
        user_id: user.id
      })
      .select()
      .single()

    if (jobError || !job) {
      return { success: false, error: 'Failed to create job' }
    }

    // Assign initial roles if provided
    if (params.initialAssignments && params.initialAssignments.length > 0) {
      const assignmentParams: BulkRoleAssignmentParams = {
        job_id: job.id,
        assignments: params.initialAssignments
      }

      const assignmentSuccess = await rbacService.bulkAssignJobRoles(assignmentParams)
      if (!assignmentSuccess) {
        console.warn('Failed to assign initial roles to job')
      }
    }

    revalidatePath('/jobs')
    revalidatePath('/dashboard')

    return { success: true, jobId: job.id }
  } catch (error) {
    console.error('Error creating job with roles:', error)
    return { success: false, error: 'Internal server error' }
  }
}