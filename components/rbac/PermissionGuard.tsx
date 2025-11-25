'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { usePermission, useRole, usePermissions } from '@/lib/hooks/useRbac'
import type { RoleName } from '@/lib/types'

interface PermissionGuardProps {
  permission: string | string[]
  jobId?: string
  userId?: string
  requireAll?: boolean // If true, user must have ALL permissions. If false, ANY permission suffices
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function PermissionGuard({
  permission,
  jobId,
  userId,
  requireAll = false,
  fallback = null,
  children
}: PermissionGuardProps) {
  const permissionArray = Array.isArray(permission) ? permission : [permission]
  const { permissionStates, hasAnyPermission, hasAllPermissions, isLoading } = usePermissions(
    permissionArray,
    jobId,
    userId
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
      </div>
    )
  }

  const hasRequiredPermission = requireAll ? hasAllPermissions : hasAnyPermission

  if (!hasRequiredPermission) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

interface RoleGuardProps {
  role: RoleName | RoleName[]
  jobId?: string
  userId?: string
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function RoleGuard({
  role,
  jobId,
  userId,
  fallback = null,
  children
}: RoleGuardProps) {
  const roleArray = Array.isArray(role) ? role : [role]
  const { shouldRender, isLoading } = useRoleBasedRender(roleArray, jobId, userId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!shouldRender) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// Hook used in RoleGuard above
function useRoleBasedRender(roles: RoleName[], jobId?: string, userId?: string) {
  const roleChecks = roles.map(roleName => useRole(roleName, jobId, userId))

  const isLoading = roleChecks.some(check => check.isLoading)
  const hasAnyRole = roleChecks.some(check => check.hasRole)

  return { shouldRender: hasAnyRole, isLoading }
}

// Higher-order components for convenience
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermissions: string | string[],
  requireAll: boolean = false,
  fallback?: React.ReactNode
) {
  return function PermissionWrapper(props: P) {
    return (
      <PermissionGuard
        permission={requiredPermissions}
        requireAll={requireAll}
        fallback={fallback}
      >
        <Component {...props} />
      </PermissionGuard>
    )
  }
}

export function withRole<P extends object>(
  Component: React.ComponentType<P>,
  requiredRoles: RoleName | RoleName[],
  fallback?: React.ReactNode
) {
  return function RoleWrapper(props: P) {
    return (
      <RoleGuard role={requiredRoles} fallback={fallback}>
        <Component {...props} />
      </RoleGuard>
    )
  }
}

// Specific permission guards for common use cases

export function JobActionGuard({ jobId, action, children, fallback }: {
  jobId: string
  action: 'create' | 'update' | 'delete' | 'assign_roles'
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return (
    <PermissionGuard
      permission={`jobs.${action}`}
      jobId={jobId}
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  )
}

export function BudgetActionGuard({ jobId, action, children, fallback }: {
  jobId: string
  action: 'create' | 'update' | 'approve' | 'read'
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return (
    <PermissionGuard
      permission={`budgets.${action}`}
      jobId={jobId}
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  )
}

export function ScopeItemActionGuard({ jobId, action, children, fallback }: {
  jobId: string
  action: 'create' | 'update' | 'delete' | 'complete'
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return (
    <PermissionGuard
      permission={`scope_items.${action}`}
      jobId={jobId}
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  )
}

export function PhotoActionGuard({ jobId, action, children, fallback }: {
  jobId: string
  action: 'create' | 'update' | 'delete' | 'annotate'
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return (
    <PermissionGuard
      permission={`photos.${action}`}
      jobId={jobId}
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  )
}

// Conditional rendering components
interface ConditionalRenderProps {
  condition: boolean
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function ConditionalRender({ condition, fallback, children }: ConditionalRenderProps) {
  if (!condition) {
    return <>{fallback}</>
  }
  return <>{children}</>
}

// Permission-based button wrapper
interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  permission: string | string[]
  jobId?: string
  requireAll?: boolean
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function PermissionButton({
  permission,
  jobId,
  requireAll = false,
  fallback,
  children,
  ...props
}: PermissionButtonProps) {
  return (
    <PermissionGuard
      permission={permission}
      jobId={jobId}
      requireAll={requireAll}
      fallback={fallback || (
        <Button {...props} disabled>
          {children}
        </Button>
      )}
    >
      <Button {...props}>{children}</Button>
    </PermissionGuard>
  )
}

// Role-based button wrapper
interface RoleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  role: RoleName | RoleName[]
  jobId?: string
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function RoleButton({
  role,
  jobId,
  fallback,
  children,
  ...props
}: RoleButtonProps) {
  return (
    <RoleGuard
      role={role}
      jobId={jobId}
      fallback={fallback || (
        <Button {...props} disabled>
          {children}
        </Button>
      )}
    >
      <Button {...props}>{children}</Button>
    </RoleGuard>
  )
}

