# Role-Based Access Control (RBAC) Implementation

This document describes the complete RBAC system implemented for the Renovation Job Costing application.

## Overview

The RBAC system provides granular access control based on user roles and permissions, ensuring users can only access the features and data they're authorized for.

## Features

### Core Components

1. **Database Schema**: Complete RBAC tables with row-level security
2. **Permission System**: Fine-grained permissions for different resources
3. **Role Hierarchy**: Four main roles with increasing privileges
4. **Job-Specific Roles**: Assign different roles for different jobs
5. **Real-time Updates**: Live permission updates using Supabase Realtime
6. **UI Components**: React components for role management and permission guards

## Roles and Permissions

### System Roles

#### Owner (Level 100)
- **Full System Access**: Can manage everything
- **User Management**: Assign/remove global roles
- **Job Management**: Create, edit, delete all jobs
- **Budget Management**: Full budget control and approval
- **System Administration**: Access to admin functions

#### Project Manager (Level 80)
- **Job Management**: Create and manage jobs
- **Budget Control**: Create and edit budgets, approve changes
- **Team Management**: Assign roles to job team members
- **Scope Items**: Full scope item management
- **Photo Management**: Upload and manage photos

#### Foreman (Level 60)
- **Job View**: Read access to assigned jobs
- **Progress Updates**: Update scope items and mark complete
- **Photo Management**: Upload photos and add annotations
- **Daily Operations**: Day-to-day job management

#### Viewer (Level 20)
- **Read-Only Access**: View assigned jobs, budgets, and photos
- **No Modification**: Cannot edit any data
- **Reporting**: Can view reports and analytics

### Permission Structure

Permissions follow the pattern: `resource.action`

**Job Permissions:**
- `jobs.create` - Create new jobs
- `jobs.read` - View job details
- `jobs.update` - Edit job information
- `jobs.delete` - Delete jobs
- `jobs.assign_roles` - Manage job team roles

**Budget Permissions:**
- `budgets.create` - Create budget versions
- `budgets.read` - View budget details
- `budgets.update` - Edit budget items
- `budgets.approve` - Approve budget changes
- `budgets.delete` - Delete budget versions

**Scope Item Permissions:**
- `scope_items.create` - Add scope items
- `scope_items.read` - View scope items
- `scope_items.update` - Edit scope item details
- `scope_items.delete` - Remove scope items
- `scope_items.complete` - Mark items as complete

**Photo Permissions:**
- `photos.create` - Upload photos
- `photos.read` - View photos
- `photos.update` - Edit photo details
- `photos.delete` - Remove photos
- `photos.annotate` - Add annotations to photos

## Implementation Guide

### 1. Database Setup

Run the migration to create RBAC tables:

```sql
-- Migration: 20250125020000_rbac_system.sql
```

This creates:
- `roles` - System and custom roles
- `permissions` - Available permissions
- `role_permissions` - Role-permission mappings
- `user_roles` - Global user role assignments
- `job_role_assignments` - Job-specific role assignments

### 2. Backend Integration

#### Using the RBAC Service

```typescript
import { rbacService } from '@/lib/services/rbacService'

// Check permissions
const canEditJob = await rbacService.hasPermission({
  permission: 'jobs.update',
  job_id: 'job-123',
  user_id: 'user-456'
})

// Assign role
await rbacService.assignRole({
  user_id: 'user-456',
  role_id: 'role-789',
  job_id: 'job-123'
})

// Get user permissions
const permissions = await rbacService.getUserPermissions('user-456', 'job-123')
```

#### Server Actions

```typescript
import { assignRoleAction, removeRoleAction } from '@/app/(protected)/settings/roles/actions'

// Assign role to user
const result = await assignRoleAction({
  user_id: 'user-456',
  role_id: 'role-789',
  job_id: 'job-123'
})

// Remove role from user
const result = await removeRoleAction('user-456', 'role-789', 'job-123')
```

### 3. Frontend Components

#### Permission Guards

```tsx
import { PermissionGuard } from '@/components/rbac/PermissionGuard'

function EditJobButton({ jobId }: { jobId: string }) {
  return (
    <PermissionGuard permission="jobs.update" jobId={jobId}>
      <Button>Edit Job</Button>
    </PermissionGuard>
  )
}

// Multiple permissions (require any)
<PermissionGuard permission={['jobs.update', 'jobs.assign_roles']} jobId={jobId}>
  <Button>Manage Job</Button>
</PermissionGuard>

// Multiple permissions (require all)
<PermissionGuard permission={['budgets.read', 'scope_items.read']} jobId={jobId} requireAll>
  <Button>View Reports</Button>
</PermissionGuard>
```

#### Role Guards

```tsx
import { RoleGuard } from '@/components/rbac/PermissionGuard'

function AdminPanel() {
  return (
    <RoleGuard role={['owner', 'project_manager']}>
      <div>Admin Content</div>
    </RoleGuard>
  )
}
```

#### React Hooks

```tsx
import { usePermission, useRole, useUserPermissions } from '@/lib/hooks/useRbac'

function JobDetails({ jobId }: { jobId: string }) {
  const { hasPermission: canEdit } = usePermission('jobs.update', jobId)
  const { hasRole: isManager } = useRole('project_manager', jobId)
  const { data: permissions } = useUserPermissions(undefined, jobId)

  return (
    <div>
      {canEdit && <Button>Edit</Button>}
      {isManager && <Button>Manage Team</Button>}
    </div>
  )
}
```

#### Role Management UI

```tsx
import { RoleSelector } from '@/components/rbac/RoleSelector'
import { UserRoleManager } from '@/components/rbac/UserRoleManager'
import { JobRoleManager } from '@/components/rbac/JobRoleManager'

// Role selection dropdown
<RoleSelector
  selectedRoleId={selectedRole}
  onRoleChange={setSelectedRole}
  excludeRoles={['owner']}
/>

// Global role management
<UserRoleManager onUpdate={() => console.log('updated')} />

// Job-specific role management
<JobRoleManager
  jobId="job-123"
  jobName="Kitchen Renovation"
  onRoleAssignmentChange={() => console.log('roles changed')}
/>
```

### 4. Route Protection

The middleware automatically protects routes based on user roles:

```typescript
// middleware.ts configuration
const protectedRoutes = {
  '/settings/roles': ['owner', 'project_manager'],
  '/admin': ['owner'],
  '/api/admin': ['owner'],
}
```

### 5. Database Functions

The system includes helper database functions:

```sql
-- Check user permission
SELECT user_has_permission('user-uuid', 'jobs.update', 'job-uuid');

-- Get user permissions
SELECT * FROM get_user_permissions('user-uuid', 'job-uuid');

-- Get user's highest role level
SELECT get_user_max_role_level('user-uuid', 'job-uuid');
```

## Usage Examples

### Creating a New Job with Initial Roles

```typescript
import { createJobWithRolesAction } from '@/app/(protected)/settings/roles/actions'

const result = await createJobWithRolesAction({
  jobData: {
    name: 'Bathroom Renovation',
    client_name: 'John Doe',
    address: '123 Main St'
  },
  initialAssignments: [
    { userId: 'user-456', roleId: 'project-manager-role-id' },
    { userId: 'user-789', roleId: 'foreman-role-id' }
  ]
})
```

### Conditional Rendering Based on Permissions

```tsx
function JobActions({ jobId }: { jobId: string }) {
  return (
    <div className="flex gap-2">
      <JobActionGuard jobId={jobId} action="update">
        <Button variant="outline">Edit Job</Button>
      </JobActionGuard>

      <BudgetActionGuard jobId={jobId} action="create">
        <Button>Create Budget</Button>
      </BudgetActionGuard>

      <ScopeItemActionGuard jobId={jobId} action="create">
        <Button>Add Scope Item</Button>
      </ScopeItemActionGuard>

      <PhotoActionGuard jobId={jobId} action="create">
        <Button variant="outline">Upload Photos</Button>
      </PhotoActionGuard>
    </div>
  )
}
```

### Real-time Permission Updates

```tsx
import { useRealtimePermissions } from '@/lib/hooks/useRbac'

function UserProfile() {
  const { data: permissions } = useRealtimePermissions('user-123', 'job-456')

  // This will automatically update when permissions change
  useEffect(() => {
    console.log('Permissions updated:', permissions)
  }, [permissions])
}
```

## Security Features

### Row-Level Security (RLS)

All RBAC tables are protected with RLS policies:

- Users can only see their own role assignments
- Job role assignments are visible to job team members
- Admins can manage all roles
- Permission checks happen at the database level

### Security Headers

The middleware adds comprehensive security headers:

- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- Referrer Policy
- XSS Protection

### Audit Trail

All role assignments include:
- Who assigned the role
- When the role was assigned
- Active/inactive status for soft deletes

## Best Practices

### 1. Permission Checking

Always check permissions at both the UI and server levels:

```tsx
// UI level (for UX)
<PermissionGuard permission="jobs.update" jobId={jobId}>
  <EditButton />
</PermissionGuard>

// Server level (for security)
export async function updateJobAction(jobId: string, data: JobData) {
  const { hasPermission } = await checkPermissionAction({
    permission: 'jobs.update',
    jobId
  })

  if (!hasPermission) {
    throw new Error('Insufficient permissions')
  }

  // Update job...
}
```

### 2. Role Assignment

- Assign the minimum necessary roles
- Use job-specific roles when possible
- Regularly review and clean up role assignments
- Use the principle of least privilege

### 3. Permission Design

- Keep permissions granular but manageable
- Use consistent naming (resource.action)
- Document what each permission allows
- Test permission changes thoroughly

## Migration Guide

### From Existing System

1. **Run the migration**: Execute the RBAC migration
2. **Assign initial roles**: Use the role management UI
3. **Update existing code**: Add permission guards to sensitive actions
4. **Test thoroughly**: Verify access controls work correctly
5. **Train users**: Educate team members on the new role system

### Code Updates

Replace direct access checks with RBAC components:

```typescript
// Before
function AdminButton() {
  const { user } = useAuth()
  if (user?.isAdmin) {
    return <Button>Admin</Button>
  }
  return null
}

// After
function AdminButton() {
  return (
    <RoleGuard role="owner">
      <Button>Admin</Button>
    </RoleGuard>
  )
}
```

## Troubleshooting

### Common Issues

1. **Permission Not Working**
   - Check database function exists
   - Verify RLS policies are enabled
   - Ensure user has active role assignment

2. **Role Assignment Fails**
   - Check user has management permissions
   - Verify role exists and is active
   - Check database constraints

3. **UI Not Updating**
   - Clear React Query cache
   - Check Supabase Realtime subscription
   - Verify component re-renders

### Debug Commands

```sql
-- Check user roles
SELECT r.name, r.level, ur.is_active
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE ur.user_id = 'user-uuid';

-- Check job-specific roles
SELECT r.name, jra.is_active
FROM job_role_assignments jra
JOIN roles r ON jra.role_id = r.id
WHERE jra.user_id = 'user-uuid' AND jra.job_id = 'job-uuid';

-- Test permission function
SELECT user_has_permission('user-uuid', 'jobs.update', 'job-uuid');
```

## Future Enhancements

1. **Custom Roles**: Allow creation of custom roles beyond system roles
2. **Time-Based Roles**: Temporary role assignments with expiration
3. **Approval Workflows**: Require approval for certain role changes
4. **Permission Inheritance**: Role inheritance and delegation
5. **Audit Logging**: Detailed audit logs for all RBAC actions

## Support

For issues or questions about the RBAC implementation:

1. Check this documentation
2. Review the database migration for schema details
3. Examine the service layer for implementation patterns
4. Test with the provided example components