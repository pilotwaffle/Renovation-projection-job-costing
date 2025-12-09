
export type RoleName =
    | 'system_admin'
    | 'company_admin'
    | 'project_manager'
    | 'site_supervisor'
    | 'estimator'
    | 'finance_manager'
    | 'client'
    | 'subcontractor'
    | 'viewer'

export const SYSTEM_ROLES: RoleName[] = [
    'system_admin',
    'company_admin',
    'project_manager',
    'site_supervisor',
    'estimator',
    'finance_manager',
    'client',
    'subcontractor',
    'viewer'
]

export interface RoleHierarchyItem {
    level: number
    displayName: string
    description: string
}

export const ROLE_HIERARCHY: Record<RoleName, RoleHierarchyItem> = {
    system_admin: { level: 100, displayName: 'System Admin', description: 'Full system access' },
    company_admin: { level: 90, displayName: 'Company Admin', description: 'Manage company settings and users' },
    finance_manager: { level: 80, displayName: 'Finance Manager', description: 'Manage billing and financial reports' },
    project_manager: { level: 70, displayName: 'Project Manager', description: 'Manage projects and budgets' },
    estimator: { level: 60, displayName: 'Estimator', description: 'Create and edit estimates' },
    site_supervisor: { level: 50, displayName: 'Site Supervisor', description: 'Manage daily site operations' },
    subcontractor: { level: 30, displayName: 'Subcontractor', description: 'View assigned tasks and items' },
    client: { level: 20, displayName: 'Client', description: 'View project progress' },
    viewer: { level: 10, displayName: 'Viewer', description: 'Read-only access' }
}

export interface Role {
    id: string
    name: string
    display_name: string
    description: string | null
    level: number
    is_system_role: boolean
    created_at: string
    updated_at: string
}

export interface Permission {
    id: string
    name: string
    description: string | null
    resource: string
    action: string
    created_at: string
}

export interface UserRole {
    user_id: string
    role_id: string
    assigned_by: string | null
    is_active: boolean
    created_at: string
    updated_at: string
    roles?: Role
}

export interface JobRoleAssignment {
    id: string
    job_id: string
    user_id: string
    role_id: string
    assigned_by: string | null
    is_active: boolean
    created_at: string
    updated_at: string
    roles?: Role
    jobs?: { name: string }
    user?: any
}

export interface UserPermission {
    permission_name: string
    resource: string
    action: string
}

export interface UserWithRoles {
    id: string
    email: string
    user_metadata: any
    global_roles: Role[]
    job_roles: {
        job_id: string
        job_name: string
        role: Role
    }[]
}

export interface PermissionCheckParams {
    permission: string
    job_id?: string
    user_id?: string
}

export interface RoleAssignmentParams {
    user_id: string
    role_id: string
    job_id?: string
}

export interface BulkRoleAssignmentParams {
    job_id: string
    assignments: {
        user_id: string
        role_id: string
    }[]
}

export interface UserHasPermissionParams {
    user_uuid: string
    permission_name: string
    job_uuid: string | null
}

export interface GetUserPermissionsParams {
    user_uuid: string
    job_uuid: string | null
}

export interface GetUserMaxRoleLevelParams {
    user_uuid: string
    job_uuid: string | null
}
