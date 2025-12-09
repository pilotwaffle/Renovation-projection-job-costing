'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Shield, Users, Settings, Crown, UserCheck } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { UserRoleManager } from '@/components/rbac/UserRoleManager'
import { RoleSelector, RoleHierarchy, RolePermissions } from '@/components/rbac/RoleSelector'
import { getUserWithRolesAction, getRolesAction } from '@/app/(protected)/settings/roles/actions'
import { useCurrentUserWithRoles, useRoles } from '@/lib/hooks/useRbac'

export default function RolesPage() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUserWithRoles()
  const { data: roles, isLoading: rolesLoading } = useRoles()

  if (userLoading || rolesLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Role Management</h1>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading role information...</p>
        </div>
      </div>
    )
  }

  const userRole = currentUser?.global_roles[0] // Get primary role
  const canManageRoles = currentUser?.global_roles.some(role =>
    ['owner', 'project_manager'].includes(role.name)
  )

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Role Management</h1>
            <p className="text-muted-foreground">
              Manage user roles and permissions for your organization
            </p>
          </div>
        </div>
        {userRole && (
          <Badge variant="secondary" className="text-sm">
            Your Role: {userRole.display_name}
          </Badge>
        )}
      </div>

      {/* Current Role Overview */}
      {currentUser && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Your Current Role
            </CardTitle>
            <CardDescription>
              Your assigned roles and permissions across the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Global Roles */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Global Roles
                </h4>
                {currentUser.global_roles.length > 0 ? (
                  <div className="space-y-2">
                    {currentUser.global_roles.map((role) => (
                      <div key={role.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {role.name === 'owner' && <Crown className="h-4 w-4 text-purple-600" />}
                          {role.name === 'project_manager' && <Users className="h-4 w-4 text-blue-600" />}
                          {role.name === 'foreman' && <Settings className="h-4 w-4 text-green-600" />}
                          {role.name === 'viewer' && <UserCheck className="h-4 w-4 text-gray-600" />}
                          <span>{role.display_name}</span>
                        </div>
                        <Badge variant="outline">Level {role.level}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No global roles assigned</p>
                )}
              </div>

              {/* Job-Specific Roles */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Job-Specific Roles
                </h4>
                {currentUser.job_roles.length > 0 ? (
                  <div className="space-y-2">
                    {currentUser.job_roles.map((jobRole, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{jobRole.job_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {jobRole.role.display_name}
                          </div>
                        </div>
                        <Badge variant="outline">Level {jobRole.role.level}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No job-specific roles assigned</p>
                )}
              </div>
            </div>

            {/* Role Hierarchy */}
            {userRole && (
              <div className="mt-6">
                <RoleHierarchy currentRole={userRole} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Role Management Tabs */}
      {canManageRoles && (
        <Tabs defaultValue="global" className="space-y-4">
          <TabsList>
            <TabsTrigger value="global">Global Roles</TabsTrigger>
            <TabsTrigger value="permissions">Role Permissions</TabsTrigger>
            <TabsTrigger value="hierarchy">Role Hierarchy</TabsTrigger>
          </TabsList>

          <TabsContent value="global">
            <Card>
              <CardHeader>
                <CardTitle>Global Role Management</CardTitle>
                <CardDescription>
                  Assign and manage global roles for users across the entire system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserRoleManager
                  onUpdate={() => {
                    // Refresh current user data
                    window.location.reload()
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions">
            <div className="grid gap-4 md:grid-cols-2">
              {roles?.map((role) => (
                <Card key={role.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {role.name === 'owner' && <Crown className="h-5 w-5 text-purple-600" />}
                      {role.name === 'project_manager' && <Users className="h-5 w-5 text-blue-600" />}
                      {role.name === 'foreman' && <Settings className="h-5 w-5 text-green-600" />}
                      {role.name === 'viewer' && <UserCheck className="h-5 w-5 text-gray-600" />}
                      {role.display_name}
                    </CardTitle>
                    <CardDescription>{role.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Access Level</span>
                        <Badge variant="outline">Level {role.level}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Type</span>
                        <Badge variant={role.is_system_role ? "default" : "secondary"}>
                          {role.is_system_role ? 'System Role' : 'Custom Role'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="hierarchy">
            <div className="grid gap-4 md:grid-cols-2">
              {roles?.map((role) => (
                <RoleHierarchy key={role.id} currentRole={role} showAll={false} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Access Denied for Non-Managers */}
      {!canManageRoles && (
        <Card>
          <CardHeader>
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>
              You don't have permission to manage roles. Contact an owner or project manager for assistance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Only users with Owner or Project Manager roles can manage user roles and permissions.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}