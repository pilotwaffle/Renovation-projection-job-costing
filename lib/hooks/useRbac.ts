'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { rbacService } from '@/lib/services/rbacService'
import type {
  Role,
  Permission,
  UserRole,
  JobRoleAssignment,
  UserWithRoles,
  PermissionCheckParams,
  RoleAssignmentParams,
  BulkRoleAssignmentParams,
  RoleName
} from '@/lib/types'

const supabase = createClient()

/**
 * Hook for checking user permissions
 */
export function usePermission(permission: string, jobId?: string, userId?: string) {
  const [hasPermission, setHasPermission] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function checkPermission() {
      setIsLoading(true)
      try {
        const result = await rbacService.hasPermission({
          permission,
          job_id: jobId,
          user_id: userId
        })
        setHasPermission(result)
      } catch (error) {
        console.error('Error checking permission:', error)
        setHasPermission(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkPermission()
  }, [permission, jobId, userId])

  return { hasPermission, isLoading }
}

/**
 * Hook for checking multiple permissions
 */
export function usePermissions(permissions: string[], jobId?: string, userId?: string) {
  const [permissionStates, setPermissionStates] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function checkPermissions() {
      setIsLoading(true)
      try {
        const results = await Promise.all(
          permissions.map(async (permission) => {
            const hasPermission = await rbacService.hasPermission({
              permission,
              job_id: jobId,
              user_id: userId
            })
            return [permission, hasPermission] as const
          })
        )

        const permissionMap = Object.fromEntries(results)
        setPermissionStates(permissionMap)
      } catch (error) {
        console.error('Error checking permissions:', error)
        const errorMap = Object.fromEntries(
          permissions.map(p => [p, false] as const)
        )
        setPermissionStates(errorMap)
      } finally {
        setIsLoading(false)
      }
    }

    if (permissions.length > 0) {
      checkPermissions()
    }
  }, [permissions.join(','), jobId, userId])

  const hasAnyPermission = Object.values(permissionStates).some(Boolean)
  const hasAllPermissions = Object.values(permissionStates).every(Boolean)

  return {
    permissionStates,
    hasAnyPermission,
    hasAllPermissions,
    isLoading
  }
}

/**
 * Hook for checking if user has a specific role
 */
export function useRole(roleName: RoleName, jobId?: string, userId?: string) {
  const [hasRole, setHasRole] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function checkRole() {
      setIsLoading(true)
      try {
        const result = await rbacService.hasRole(roleName, jobId, userId)
        setHasRole(result)
      } catch (error) {
        console.error('Error checking role:', error)
        setHasRole(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkRole()
  }, [roleName, jobId, userId])

  return { hasRole, isLoading }
}

/**
 * Hook for getting current user with all their roles
 */
export function useCurrentUserWithRoles() {
  return useQuery({
    queryKey: ['currentUserWithRoles'],
    queryFn: () => rbacService.getUserWithRoles(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook for getting user permissions
 */
export function useUserPermissions(userId?: string, jobId?: string) {
  return useQuery({
    queryKey: ['userPermissions', userId, jobId],
    queryFn: () => rbacService.getUserPermissions(userId, jobId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook for getting all available roles
 */
export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => rbacService.getRoles(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Hook for getting role permissions
 */
export function useRolePermissions(roleId: string) {
  return useQuery({
    queryKey: ['rolePermissions', roleId],
    queryFn: () => rbacService.getRolePermissions(roleId),
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!roleId
  })
}

/**
 * Hook for getting job role assignments
 */
export function useJobRoleAssignments(jobId: string) {
  return useQuery({
    queryKey: ['jobRoleAssignments', jobId],
    queryFn: () => rbacService.getJobRoleAssignments(jobId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!jobId
  })
}

/**
 * Hook for assigning roles to users
 */
export function useAssignRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: RoleAssignmentParams & { assignedBy?: string }) =>
      rbacService.assignRole(params, params.assignedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserWithRoles'] })
      queryClient.invalidateQueries({ queryKey: ['userPermissions'] })
      queryClient.invalidateQueries({ queryKey: ['jobRoleAssignments'] })
    }
  })
}

/**
 * Hook for removing roles from users
 */
export function useRemoveRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, roleId, jobId }: {
      userId: string
      roleId: string
      jobId?: string
    }) => rbacService.removeRole(userId, roleId, jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserWithRoles'] })
      queryClient.invalidateQueries({ queryKey: ['userPermissions'] })
      queryClient.invalidateQueries({ queryKey: ['jobRoleAssignments'] })
    }
  })
}

/**
 * Hook for bulk assigning job roles
 */
export function useBulkAssignJobRoles() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: BulkRoleAssignmentParams) =>
      rbacService.bulkAssignJobRoles(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobRoleAssignments'] })
      queryClient.invalidateQueries({ queryKey: ['currentUserWithRoles'] })
    }
  })
}

/**
 * Hook for getting assignable roles for current user
 */
export function useAssignableRoles(currentUserId?: string) {
  return useQuery({
    queryKey: ['assignableRoles', currentUserId],
    queryFn: () => rbacService.getAssignableRoles(currentUserId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook for real-time permission updates using Supabase Realtime
 */
export function useRealtimePermissions(userId?: string, jobId?: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId) return

    // Subscribe to changes in user_roles and job_role_assignments
    const channel = supabase
      .channel('rbac-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles',
          filter: `user_id=eq.${userId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['currentUserWithRoles'] })
          queryClient.invalidateQueries({ queryKey: ['userPermissions'] })
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'job_role_assignments',
          filter: `user_id=eq.${userId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['currentUserWithRoles'] })
          queryClient.invalidateQueries({ queryKey: ['userPermissions'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, queryClient, jobId])

  // Return the permissions query for convenience
  return useUserPermissions(userId, jobId)
}

/**
 * Hook for permission-based component visibility
 */
export function useConditionalRender(
  permissions: string | string[],
  requireAll: boolean = false,
  jobId?: string
) {
  const permissionArray = Array.isArray(permissions) ? permissions : [permissions]
  const { permissionStates, hasAnyPermission, hasAllPermissions, isLoading } = usePermissions(
    permissionArray,
    jobId
  )

  const shouldRender = requireAll ? hasAllPermissions : hasAnyPermission

  return { shouldRender, isLoading, permissionStates }
}

/**
 * Hook for role-based component visibility
 */
export function useRoleBasedRender(roles: RoleName | RoleName[], jobId?: string) {
  const roleArray = Array.isArray(roles) ? roles : [roles]

  const roleChecks = roleArray.map(roleName => useRole(roleName, jobId))

  const isLoading = roleChecks.some(check => check.isLoading)
  const hasAnyRole = roleChecks.some(check => check.hasRole)
  const hasAllRoles = roleChecks.every(check => check.hasRole)

  return {
    shouldRender: hasAnyRole,
    isLoading,
    roleStates: Object.fromEntries(
      roleArray.map((role, index) => [role, roleChecks[index].hasRole])
    )
  }
}

/**
 * Higher-order component for permission-based rendering
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermissions: string | string[],
  requireAll: boolean = false
) {
  return function PermissionWrapper(props: P) {
    const { shouldRender, isLoading } = useConditionalRender(
      requiredPermissions,
      requireAll
    )

    if (isLoading) {
      return <div>Loading...</div>
    }

    if (!shouldRender) {
      return null
    }

    return <Component {...props} />
  }
}

/**
 * Higher-order component for role-based rendering
 */
export function withRole<P extends object>(
  Component: React.ComponentType<P>,
  requiredRoles: RoleName | RoleName[]
) {
  return function RoleWrapper(props: P) {
    const { shouldRender, isLoading } = useRoleBasedRender(requiredRoles)

    if (isLoading) {
      return <div>Loading...</div>
    }

    if (!shouldRender) {
      return null
    }

    return <Component {...props} />
  }
}