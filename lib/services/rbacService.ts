import { createClient } from '@/lib/supabase/client'
import type {
  Role,
  Permission,
  UserRole,
  JobRoleAssignment,
  UserPermission,
  UserWithRoles,
  PermissionCheckParams,
  RoleAssignmentParams,
  BulkRoleAssignmentParams,
  UserHasPermissionParams,
  GetUserPermissionsParams,
  GetUserMaxRoleLevelParams,
  RoleName,
  SYSTEM_ROLES,
  ROLE_HIERARCHY
} from '@/lib/types'

/**
 * RBAC Service - Role-Based Access Control
 *
 * This service provides functions for managing roles, permissions,
 * and access control throughout the application.
 */

export class RbacService {
  private supabase = createClient()

  // =============================================
  // Permission Checking Functions
  // =============================================

  /**
   * Check if a user has a specific permission
   */
  async hasPermission(params: PermissionCheckParams): Promise<boolean> {
    const { permission, job_id, user_id } = params

    // Get current user if not provided
    const userId = user_id || await this.getCurrentUserId()
    if (!userId) return false

    // If checking with job_id, use the database function
    if (job_id) {
      const { data, error } = await this.supabase
        .rpc('user_has_permission', {
          user_uuid: userId,
          permission_name: permission,
          job_uuid: job_id
        } as UserHasPermissionParams)

      if (error) {
        console.error('Error checking permission:', error)
        return false
      }

      return data || false
    }

    // Check global permissions by querying user_roles and role_permissions
    const { data, error } = await this.supabase
      .from('role_permissions')
      .select(`
        permission_id,
        permissions(name)
      `)
      .eq('user_roles.user_id', userId)
      .eq('user_roles.is_active', true)
      .eq('permissions.name', permission)
      .join('user_roles', 'role_permissions.role_id', 'user_roles.role_id')
      .join('permissions', 'role_permissions.permission_id', 'permissions.id')
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking global permission:', error)
      return false
    }

    return !!data
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId?: string, jobId?: string): Promise<UserPermission[]> {
    const uid = userId || await this.getCurrentUserId()
    if (!uid) return []

    const { data, error } = await this.supabase
      .rpc('get_user_permissions', {
        user_uuid: uid,
        job_uuid: jobId || null
      } as GetUserPermissionsParams)

    if (error) {
      console.error('Error getting user permissions:', error)
      return []
    }

    return data || []
  }

  /**
   * Get user's highest role level
   */
  async getUserMaxRoleLevel(jobId?: string, userId?: string): Promise<number> {
    const uid = userId || await this.getCurrentUserId()
    if (!uid) return 0

    const { data, error } = await this.supabase
      .rpc('get_user_max_role_level', {
        user_uuid: uid,
        job_uuid: jobId || null
      } as GetUserMaxRoleLevelParams)

    if (error) {
      console.error('Error getting user max role level:', error)
      return 0
    }

    return data || 0
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(permissions: string[], jobId?: string, userId?: string): Promise<boolean> {
    const results = await Promise.all(
      permissions.map(permission =>
        this.hasPermission({ permission, job_id: jobId, user_id: userId })
      )
    )
    return results.some(Boolean)
  }

  /**
   * Check if user has all of the specified permissions
   */
  async hasAllPermissions(permissions: string[], jobId?: string, userId?: string): Promise<boolean> {
    const results = await Promise.all(
      permissions.map(permission =>
        this.hasPermission({ permission, job_id: jobId, user_id: userId })
      )
    )
    return results.every(Boolean)
  }

  /**
   * Check if user has a specific role
   */
  async hasRole(roleName: RoleName, jobId?: string, userId?: string): Promise<boolean> {
    const uid = userId || await this.getCurrentUserId()
    if (!uid) return false

    if (jobId) {
      // Check job-specific role
      const { data, error } = await this.supabase
        .from('job_role_assignments')
        .select(`
          roles(name)
        `)
        .eq('job_id', jobId)
        .eq('user_id', uid)
        .eq('is_active', true)
        .eq('roles.name', roleName)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking job role:', error)
        return false
      }

      return !!data
    } else {
      // Check global role
      const { data, error } = await this.supabase
        .from('user_roles')
        .select(`
          roles(name)
        `)
        .eq('user_id', uid)
        .eq('is_active', true)
        .eq('roles.name', roleName)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking global role:', error)
        return false
      }

      return !!data
    }
  }

  // =============================================
  // Role Management Functions
  // =============================================

  /**
   * Get all available roles
   */
  async getRoles(): Promise<Role[]> {
    const { data, error } = await this.supabase
      .from('roles')
      .select('*')
      .order('level', { ascending: false })

    if (error) {
      console.error('Error getting roles:', error)
      return []
    }

    return data || []
  }

  /**
   * Get role by ID
   */
  async getRole(roleId: string): Promise<Role | null> {
    const { data, error } = await this.supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .single()

    if (error) {
      console.error('Error getting role:', error)
      return null
    }

    return data
  }

  /**
   * Get role by name
   */
  async getRoleByName(roleName: RoleName): Promise<Role | null> {
    const { data, error } = await this.supabase
      .from('roles')
      .select('*')
      .eq('name', roleName)
      .single()

    if (error) {
      console.error('Error getting role by name:', error)
      return null
    }

    return data
  }

  /**
   * Get all permissions for a role
   */
  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const { data, error } = await this.supabase
      .from('role_permissions')
      .select(`
        permissions(*)
      `)
      .eq('role_id', roleId)

    if (error) {
      console.error('Error getting role permissions:', error)
      return []
    }

    return (data || []).map(rp => rp.permissions).filter(Boolean)
  }

  // =============================================
  // User Role Management Functions
  // =============================================

  /**
   * Get all roles for a user (global + job-specific)
   */
  async getUserWithRoles(userId?: string): Promise<UserWithRoles | null> {
    const uid = userId || await this.getCurrentUserId()
    if (!uid) return null

    // Get user info
    const { data: userData, error: userError } = await this.supabase.auth.admin.getUser(uid)
    if (userError || !userData.user) {
      console.error('Error getting user:', userError)
      return null
    }

    // Get global roles
    const { data: globalRoles, error: globalError } = await this.supabase
      .from('user_roles')
      .select(`
        roles(*)
      `)
      .eq('user_id', uid)
      .eq('is_active', true)

    if (globalError) {
      console.error('Error getting global roles:', globalError)
      return null
    }

    // Get job-specific roles
    const { data: jobRoles, error: jobError } = await this.supabase
      .from('job_role_assignments')
      .select(`
        job_id,
        jobs(name),
        roles(*)
      `)
      .eq('user_id', uid)
      .eq('is_active', true)

    if (jobError) {
      console.error('Error getting job roles:', jobError)
      return null
    }

    return {
      id: userData.user.id,
      email: userData.user.email || '',
      user_metadata: userData.user.user_metadata,
      global_roles: (globalRoles || []).map(gr => gr.roles),
      job_roles: (jobRoles || []).map(jr => ({
        job_id: jr.job_id,
        job_name: jr.jobs?.name || '',
        role: jr.roles
      }))
    }
  }

  /**
   * Assign a role to a user
   */
  async assignRole(params: RoleAssignmentParams, assignedBy?: string): Promise<boolean> {
    const { user_id, role_id, job_id } = params
    const assignerId = assignedBy || await this.getCurrentUserId()

    if (!assignerId) {
      console.error('No assigner ID provided')
      return false
    }

    if (job_id) {
      // Assign job-specific role
      const { error } = await this.supabase
        .from('job_role_assignments')
        .upsert({
          job_id,
          user_id,
          role_id,
          assigned_by: assignerId,
          is_active: true
        }, {
          onConflict: 'job_id,user_id,role_id'
        })

      if (error) {
        console.error('Error assigning job role:', error)
        return false
      }
    } else {
      // Assign global role
      const { error } = await this.supabase
        .from('user_roles')
        .upsert({
          user_id,
          role_id,
          assigned_by: assignerId,
          is_active: true
        }, {
          onConflict: 'user_id,role_id'
        })

      if (error) {
        console.error('Error assigning global role:', error)
        return false
      }
    }

    return true
  }

  /**
   * Remove a role from a user
   */
  async removeRole(userId: string, roleId: string, jobId?: string): Promise<boolean> {
    if (jobId) {
      // Remove job-specific role
      const { error } = await this.supabase
        .from('job_role_assignments')
        .update({ is_active: false })
        .eq('job_id', jobId)
        .eq('user_id', userId)
        .eq('role_id', roleId)

      if (error) {
        console.error('Error removing job role:', error)
        return false
      }
    } else {
      // Remove global role
      const { error } = await this.supabase
        .from('user_roles')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('role_id', roleId)

      if (error) {
        console.error('Error removing global role:', error)
        return false
      }
    }

    return true
  }

  /**
   * Bulk assign roles to users for a job
   */
  async bulkAssignJobRoles(params: BulkRoleAssignmentParams): Promise<boolean> {
    const { job_id, assignments } = params
    const assignedBy = await this.getCurrentUserId()

    if (!assignedBy) {
      console.error('No assigner ID provided')
      return false
    }

    const insertData = assignments.map(({ user_id, role_id }) => ({
      job_id,
      user_id,
      role_id,
      assigned_by: assignedBy,
      is_active: true
    }))

    const { error } = await this.supabase
      .from('job_role_assignments')
      .upsert(insertData, {
        onConflict: 'job_id,user_id,role_id'
      })

    if (error) {
      console.error('Error bulk assigning job roles:', error)
      return false
    }

    return true
  }

  /**
   * Get job role assignments
   */
  async getJobRoleAssignments(jobId: string): Promise<JobRoleAssignment[]> {
    const { data, error } = await this.supabase
      .from('job_role_assignments')
      .select(`
        *,
        roles(*),
        users!inner(
          id,
          email,
          user_metadata
        )
      `)
      .eq('job_id', jobId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error getting job role assignments:', error)
      return []
    }

    return (data || []).map(assignment => ({
      ...assignment,
      user: assignment.users
    }))
  }

  // =============================================
  // Utility Functions
  // =============================================

  /**
   * Get current user ID
   */
  private async getCurrentUserId(): Promise<string | null> {
    const { data: { user } } = await this.supabase.auth.getUser()
    return user?.id || null
  }

  /**
   * Check if user can perform action on resource
   * Helper that combines resource+action into permission string
   */
  async canPerformAction(resource: string, action: string, jobId?: string, userId?: string): Promise<boolean> {
    const permission = `${resource}.${action}`
    return this.hasPermission({ permission, job_id: jobId, user_id: userId })
  }

  /**
   * Get role hierarchy level for comparison
   */
  getRoleLevel(roleName: RoleName): number {
    return ROLE_HIERARCHY[roleName]?.level || 0
  }

  /**
   * Check if one role can manage another role
   */
  canManageRole(managerRole: RoleName, targetRole: RoleName): boolean {
    return this.getRoleLevel(managerRole) > this.getRoleLevel(targetRole)
  }

  /**
   * Get system roles
   */
  getSystemRoles(): Role[] {
    return SYSTEM_ROLES.map(roleName => ({
      id: roleName,
      name: roleName,
      display_name: ROLE_HIERARCHY[roleName].displayName,
      description: ROLE_HIERARCHY[roleName].description,
      level: ROLE_HIERARCHY[roleName].level,
      is_system_role: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))
  }

  /**
   * Get available roles for assignment (excluding higher privileged roles than current user)
   */
  async getAssignableRoles(currentUserId?: string): Promise<Role[]> {
    const userId = currentUserId || await this.getCurrentUserId()
    if (!userId) return []

    const userMaxLevel = await this.getUserMaxRoleLevel(undefined, userId)
    const allRoles = await this.getRoles()

    // Only return roles with lower or equal level than user's max level
    return allRoles.filter(role => role.level <= userMaxLevel)
  }
}

// Export singleton instance
export const rbacService = new RbacService()

// Export convenience functions for common use cases
export const can = (permission: string, jobId?: string) =>
  rbacService.hasPermission({ permission, job_id: jobId })

export const canPerformAction = (resource: string, action: string, jobId?: string) =>
  rbacService.canPerformAction(resource, action, jobId)

export const hasRole = (roleName: RoleName, jobId?: string) =>
  rbacService.hasRole(roleName, jobId)

export const getCurrentUserPermissions = (jobId?: string) =>
  rbacService.getUserPermissions(undefined, jobId)