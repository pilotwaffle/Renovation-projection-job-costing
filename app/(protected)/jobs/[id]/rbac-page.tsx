'use client'

import React from 'react'
import { Link } from 'next/link'
import { Camera, Plus, Edit, Settings, Users, Shield } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// Import RBAC components and hooks
import { JobRoleManager, JobRoleBadge } from '@/components/rbac/JobRoleManager'
import { PermissionGuard, JobActionGuard, ScopeItemActionGuard, PhotoActionGuard } from '@/components/rbac/PermissionGuard'
import { usePermission, useUserPermissions } from '@/lib/hooks/useRbac'

interface Job {
  id: string
  name: string
  client_name?: string
  address?: string
  status: string
  created_at: string
  updated_at: string
}

interface BudgetVersion {
  id: string
  job_id: string
  version: number
  notes?: string
  created_at: string
}

interface ScopeItem {
  id: string
  budget_version_id: string
  category_id?: string
  description: string
  estimated_material_cost: number
  estimated_labor_hours: number
  estimated_labor_rate: number
  actual_material_cost: number
  actual_labor_hours: number
  is_completed: boolean
  completed_at?: string
  notes?: string
  created_at: string
  updated_at: string
  category?: {
    id: string
    name: string
    color?: string
  }
  photo_count?: number
}

interface JobDetailPageProps {
  job: Job
  budgetVersion?: BudgetVersion
  scopeItems: ScopeItem[]
  totalPhotos: number
}

export default function JobDetailPageWithRBAC({ job, budgetVersion, scopeItems, totalPhotos }: JobDetailPageProps) {
  // Check user permissions for this job
  const { hasPermission: canManageJob } = usePermission('jobs.update', job.id)
  const { hasPermission: canAssignRoles } = usePermission('jobs.assign_roles', job.id)
  const { hasPermission: canCreateBudget } = usePermission('budgets.create', job.id)
  const { hasPermission: canCreateScopeItems } = usePermission('scope_items.create', job.id)
  const { hasPermission: canUploadPhotos } = usePermission('photos.create', job.id)

  // Calculate totals
  const totalEstimated = scopeItems.reduce((sum, item) =>
    sum + (item.estimated_material_cost + (item.estimated_labor_hours * item.estimated_labor_rate)), 0
  )
  const totalActual = scopeItems.reduce((sum, item) =>
    sum + (item.actual_material_cost + (item.actual_labor_hours * item.estimated_labor_rate)), 0
  )
  const variance = totalActual - totalEstimated

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-10">
        <header>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Link href="/jobs" className="text-sm text-blue-600 hover:text-blue-500 mb-4 inline-block">
              ← Back to Jobs
            </Link>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900">
                    {job.name}
                  </h1>
                  <JobRoleBadge jobId={job.id} />
                  <Badge variant={job.status === 'active' ? 'default' : 'secondary'}>
                    {job.status}
                  </Badge>
                </div>
                {job.client_name && <p className="mt-1 text-sm text-gray-600">Client: {job.client_name}</p>}
                {job.address && <p className="mt-1 text-sm text-gray-600">{job.address}</p>}
              </div>

              {/* Job Actions */}
              <div className="flex items-center gap-2 ml-4">
                <JobActionGuard jobId={job.id} action="update">
                  <Button variant="outline" size="sm">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Job
                  </Button>
                </JobActionGuard>

                <JobActionGuard jobId={job.id} action="assign_roles">
                  <Button variant="outline" size="sm">
                    <Users className="mr-2 h-4 w-4" />
                    Manage Team
                  </Button>
                </JobActionGuard>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
          {/* Team Management Section */}
          <JobRoleManager
            jobId={job.id}
            jobName={job.name}
            onRoleAssignmentChange={() => {
              // Refresh data when roles change
              window.location.reload()
            }}
          />

          {/* Budget Summary */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
            <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
              <dt className="truncate text-sm font-medium text-gray-500">Estimated Total</dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                ${totalEstimated.toFixed(2)}
              </dd>
            </div>
            <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
              <dt className="truncate text-sm font-medium text-gray-500">Actual Total</dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                ${totalActual.toFixed(2)}
              </dd>
            </div>
            <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
              <dt className="truncate text-sm font-medium text-gray-500">Variance</dt>
              <dd className={`mt-1 text-3xl font-semibold tracking-tight ${variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {variance > 0 ? '+' : ''}${variance.toFixed(2)}
              </dd>
            </div>
            <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
              <dt className="truncate text-sm font-medium text-gray-500">Total Photos</dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                {totalPhotos}
              </dd>
            </div>
          </div>

          {/* Budget Management */}
          <PermissionGuard permission="budgets.read" jobId={job.id}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Budget Management</CardTitle>
                    <CardDescription>
                      Manage budget versions and financial tracking
                    </CardDescription>
                  </div>
                  <JobActionGuard jobId={job.id} action="assign_roles">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Budget Version
                    </Button>
                  </JobActionGuard>
                </div>
              </CardHeader>
              <CardContent>
                {budgetVersion ? (
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Version {budgetVersion.version}</h4>
                      <p className="text-sm text-muted-foreground">
                        Created {new Date(budgetVersion.created_at).toLocaleDateString()}
                      </p>
                      {budgetVersion.notes && (
                        <p className="text-sm mt-1">{budgetVersion.notes}</p>
                      )}
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Settings className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                    <h4 className="font-medium mb-1">No Budget Yet</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create a budget to start tracking costs and scope items
                    </p>
                    <PermissionGuard permission="budgets.create" jobId={job.id}>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create First Budget
                      </Button>
                    </PermissionGuard>
                  </div>
                )}
              </CardContent>
            </Card>
          </PermissionGuard>

          {/* Scope Items */}
          <PermissionGuard permission="scope_items.read" jobId={job.id}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Scope Items</CardTitle>
                    <CardDescription>
                      Track work items, costs, and progress
                    </CardDescription>
                  </div>
                  <ScopeItemActionGuard jobId={job.id} action="create">
                    <Button asChild>
                      <Link href={`/jobs/${job.id}/items/new`}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Item
                      </Link>
                    </Button>
                  </ScopeItemActionGuard>
                </div>
              </CardHeader>
              <CardContent>
                {scopeItems.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead>
                        <tr>
                          <th className="py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Description</th>
                          <th className="py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Category</th>
                          <th className="py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Photos</th>
                          <th className="py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Estimated</th>
                          <th className="py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Actual</th>
                          <th className="py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Variance</th>
                          <th className="py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {scopeItems.map((item) => {
                          const estimated = item.estimated_material_cost + (item.estimated_labor_hours * item.estimated_labor_rate)
                          const actual = item.actual_material_cost + (item.actual_labor_hours * item.estimated_labor_rate)
                          const itemVariance = actual - estimated
                          const photoCount = item.photo_count || 0

                          return (
                            <tr key={item.id}>
                              <td className="py-4">
                                <div>
                                  <Link
                                    href={`/jobs/${job.id}/items/${item.id}`}
                                    className="text-sm font-medium text-gray-900 hover:text-blue-600"
                                  >
                                    {item.description}
                                  </Link>
                                  {item.is_completed && (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                      Completed
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 text-sm text-gray-500">
                                {item.category?.name || '-'}
                              </td>
                              <td className="py-4 text-sm text-gray-500">
                                {photoCount > 0 ? (
                                  <PermissionGuard permission="photos.read" jobId={job.id}>
                                    <Link
                                      href={`/jobs/${job.id}/items/${item.id}`}
                                      className="flex items-center text-blue-600 hover:text-blue-500"
                                    >
                                      <Camera className="w-4 h-4 mr-1" />
                                      {photoCount}
                                    </Link>
                                  </PermissionGuard>
                                ) : (
                                  <span className="text-gray-400">0</span>
                                )}
                              </td>
                              <td className="py-4 text-sm text-gray-900 text-right">${estimated.toFixed(2)}</td>
                              <td className="py-4 text-sm text-gray-900 text-right">${actual.toFixed(2)}</td>
                              <td className={`py-4 text-sm text-right ${itemVariance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {itemVariance > 0 ? '+' : ''}${itemVariance.toFixed(2)}
                              </td>
                              <td className="py-4 text-sm text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  <PermissionGuard permission="photos.read" jobId={job.id}>
                                    <Link
                                      href={`/jobs/${job.id}/items/${item.id}`}
                                      className="text-blue-600 hover:text-blue-500"
                                      title="View photos and details"
                                    >
                                      View
                                    </Link>
                                  </PermissionGuard>

                                  <ScopeItemActionGuard jobId={job.id} action="update">
                                    <span className="text-gray-300">•</span>
                                    <Link
                                      href={`/jobs/${job.id}/items/${item.id}/edit`}
                                      className="text-blue-600 hover:text-blue-500"
                                      title="Edit costs"
                                    >
                                      Edit
                                    </Link>
                                  </ScopeItemActionGuard>

                                  <PhotoActionGuard jobId={job.id} action="create">
                                    <span className="text-gray-300">•</span>
                                    <Link
                                      href={`/jobs/${job.id}/items/${item.id}/photos`}
                                      className="text-green-600 hover:text-green-500"
                                      title="Upload photos"
                                    >
                                      <Camera className="w-4 h-4" />
                                    </Link>
                                  </PhotoActionGuard>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Settings className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                    <h4 className="font-medium mb-1">No Scope Items Yet</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add scope items to track work and costs for this job
                    </p>
                    <ScopeItemActionGuard jobId={job.id} action="create">
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add First Item
                      </Button>
                    </ScopeItemActionGuard>
                  </div>
                )}
              </CardContent>
            </Card>
          </PermissionGuard>

          {/* Access Denied Message */}
          <PermissionGuard
            permission={['scope_items.read', 'budgets.read']}
            jobId={job.id}
            fallback={
              <Card>
                <CardContent className="text-center py-8">
                  <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                  <h4 className="font-medium mb-1">Access Restricted</h4>
                  <p className="text-sm text-muted-foreground">
                    You don't have permission to view job details. Contact your project manager for access.
                  </p>
                </CardContent>
              </Card>
            }
          />
        </main>
      </div>
    </div>
  )
}