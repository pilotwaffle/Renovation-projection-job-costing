'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { UserRoleManager, QuickRoleAssign } from './UserRoleManager'
import { PermissionGuard, RoleGuard } from './PermissionGuard'
import { useJobRoleAssignments, useCurrentUserWithRoles, useUserPermissions } from '@/lib/hooks/useRbac'
import { Users, Settings, Shield, Plus } from 'lucide-react'

interface JobRoleManagerProps {
  jobId: string
  jobName: string
  onRoleAssignmentChange?: () => void
}

export function JobRoleManager({
  jobId,
  jobName,
  onRoleAssignmentChange
}: JobRoleManagerProps) {
  const { data: assignments, isLoading } = useJobRoleAssignments(jobId)
  const { data: currentUser } = useCurrentUserWithRoles()
  const [isExpanded, setIsExpanded] = useState(false)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-muted"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const assignmentsByRole = assignments?.reduce((acc, assignment) => {
    if (!acc[assignment.role?.name || 'unknown']) {
      acc[assignment.role?.name || 'unknown'] = []
    }
    acc[assignment.role?.name || 'unknown'].push(assignment)
    return acc
  }, {} as Record<string, typeof assignments>) || {}

  const totalMembers = assignments?.length || 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>Team Members</CardTitle>
            <Badge variant="secondary">{totalMembers}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <PermissionGuard
              permission="jobs.assign_roles"
              jobId={jobId}
              fallback={
                <Button variant="outline" size="sm" disabled>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Member
                </Button>
              }
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? 'Collapse' : 'Expand'}
              </Button>
            </PermissionGuard>
          </div>
        </div>
        <CardDescription>
          Manage team member access and permissions for "{jobName}"
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Team Overview */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(assignmentsByRole).map(([roleName, roleAssignments]) => (
            <div key={roleName} className="flex items-center gap-2">
              <Badge variant="outline">
                {roleName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}: {roleAssignments.length}
              </Badge>
            </div>
          ))}
        </div>

        {/* Current Assignments Summary */}
        {totalMembers > 0 && !isExpanded && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Current Team</h4>
            <div className="grid gap-2">
              {assignments?.slice(0, 3).map((assignment) => (
                <div key={assignment.id} className="flex items-center gap-3 p-2 rounded-lg border">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={assignment.user?.user_metadata?.avatar_url} />
                    <AvatarFallback>
                      {assignment.user?.user_metadata?.full_name?.[0] ||
                       assignment.user?.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {assignment.user?.user_metadata?.full_name ||
                       assignment.user?.user_metadata?.name ||
                       'Unknown User'}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {assignment.user?.email}
                    </div>
                  </div>
                  {assignment.role && (
                    <Badge variant="secondary" className="text-xs">
                      {assignment.role.display_name}
                    </Badge>
                  )}
                </div>
              ))}
              {totalMembers > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(true)}
                  className="w-full"
                >
                  View all {totalMembers} team members
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Expanded View - Full Team Management */}
        {isExpanded && (
          <div className="space-y-6">
            {/* Role-based Team Organization */}
            <div className="space-y-4">
              {Object.entries(assignmentsByRole).map(([roleName, roleAssignments]) => (
                <div key={roleName} className="space-y-2">
                  <h4 className="text-sm font-medium capitalize flex items-center gap-2">
                    {roleName === 'owner' && <Shield className="h-4 w-4 text-purple-600" />}
                    {roleName === 'project_manager' && <Settings className="h-4 w-4 text-blue-600" />}
                    {roleName === 'foreman' && <Users className="h-4 w-4 text-green-600" />}
                    {roleName === 'viewer' && <Users className="h-4 w-4 text-gray-600" />}
                    {roleName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    <Badge variant="secondary">{roleAssignments.length}</Badge>
                  </h4>
                  <div className="space-y-1">
                    {roleAssignments.map((assignment) => (
                      <div key={assignment.id} className="flex items-center gap-3 p-2 rounded-lg border bg-muted/20">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={assignment.user?.user_metadata?.avatar_url} />
                          <AvatarFallback>
                            {assignment.user?.user_metadata?.full_name?.[0] ||
                             assignment.user?.email[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {assignment.user?.user_metadata?.full_name ||
                             assignment.user?.user_metadata?.name ||
                             'Unknown User'}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {assignment.user?.email}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Level {assignment.role?.level || 0}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {new Date(assignment.assigned_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Role Management */}
            <PermissionGuard
              permission="jobs.assign_roles"
              jobId={jobId}
              fallback={
                <div className="text-center py-4 text-muted-foreground">
                  <Shield className="mx-auto h-8 w-8 mb-2" />
                  <p className="text-sm">You don't have permission to manage team roles</p>
                </div>
              }
            >
              <div className="border-t pt-4">
                <UserRoleManager
                  jobId={jobId}
                  onUpdate={onRoleAssignmentChange}
                  excludeRoles={['owner']} // Exclude owner role from job assignments
                />
              </div>
            </PermissionGuard>
          </div>
        )}

        {/* Empty State */}
        {totalMembers === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="mx-auto h-12 w-12 opacity-50 mb-3" />
            <h4 className="font-medium mb-1">No team members yet</h4>
            <p className="text-sm mb-4">Add team members to collaborate on this job</p>
            <PermissionGuard
              permission="jobs.assign_roles"
              jobId={jobId}
            >
              <Button onClick={() => setIsExpanded(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Team Members
              </Button>
            </PermissionGuard>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface JobRoleBadgeProps {
  jobId: string
  showCurrentUser?: boolean
  size?: 'sm' | 'md'
}

export function JobRoleBadge({ jobId, showCurrentUser = true, size = 'md' }: JobRoleBadgeProps) {
  const { data: assignments, isLoading } = useJobRoleAssignments(jobId)
  const { data: currentUser } = useCurrentUserWithRoles()

  if (isLoading || !currentUser) {
    return null
  }

  const userAssignment = assignments?.find(a => a.user_id === currentUser.id)

  if (!showCurrentUser || !userAssignment) {
    return null
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5'
  }

  return (
    <Badge
      variant="secondary"
      className={sizeClasses[size]}
    >
      {userAssignment.role?.display_name}
    </Badge>
  )
}

export function JobPermissionsSummary({ jobId }: { jobId: string }) {
  const { data: userPermissions, isLoading } = useUserPermissions(undefined, jobId)

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">Loading permissions...</div>
    )
  }

  const permissionsByResource = userPermissions?.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = []
    }
    acc[perm.resource].push(perm.action)
    return acc
  }, {} as Record<string, string[]>) || {}

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Your Permissions</h4>
      {Object.entries(permissionsByResource).map(([resource, actions]) => (
        <div key={resource} className="flex items-center gap-2 text-xs">
          <span className="font-medium capitalize">{resource}:</span>
          <span className="text-muted-foreground">
            {actions.join(', ')}
          </span>
        </div>
      ))}
    </div>
  )
}