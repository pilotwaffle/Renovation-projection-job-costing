export interface Job {
  id: string
  user_id: string
  name: string
  client_name: string | null
  address: string | null
  status: 'active' | 'completed' | 'archived'
  created_at: string
  updated_at: string
}

export interface BudgetVersion {
  id: string
  job_id: string
  version: number
  notes: string | null
  created_at: string
  created_by: string | null
}

export interface Category {
  id: string
  name: string
  sort_order: number | null
  color: string | null
}

export interface ScopeItem {
  id: string
  budget_version_id: string
  category_id: string | null
  description: string
  estimated_material_cost: number
  estimated_labor_hours: number
  estimated_labor_rate: number
  actual_material_cost: number
  actual_labor_hours: number
  is_completed: boolean
  completed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ScopeItemWithCategory extends ScopeItem {
  category: Category | null
}

export interface ScopeItemWithPhotos extends ScopeItemWithCategory {
  photos?: ScopeItemPhoto[]
  photo_count?: number
}

export interface BudgetTotals {
  total_estimated: number
  total_actual: number
  total_variance: number
  variance_percentage: number
}

// Notification System Types

export interface NotificationPreferences {
  id: string
  user_id: string
  variance_alerts_enabled: boolean
  variance_threshold_percentage: number
  change_order_notifications_enabled: boolean
  daily_summary_enabled: boolean
  weekly_summary_enabled: boolean
  milestone_alerts_enabled: boolean
  milestone_thresholds: number[]
  email_address: string
  timezone: string
  created_at: string
  updated_at: string
}

export interface NotificationLog {
  id: string
  user_id: string
  job_id: string | null
  notification_type: NotificationType
  email_address: string
  subject: string
  template_name: string
  status: NotificationStatus
  delivery_attempts: number
  last_attempt_at: string | null
  sent_at: string | null
  error_message: string | null
  error_code: string | null
  context_data: Record<string, any>
  created_at: string
}

export interface NotificationQueue {
  id: string
  user_id: string
  job_id: string | null
  notification_type: NotificationType
  priority: number
  scheduled_at: string
  max_attempts: number
  status: QueueStatus
  attempts: number
  last_attempt_at: string | null
  completed_at: string | null
  error_message: string | null
  context_data: Record<string, any>
  created_at: string
}

export type NotificationType =
  | 'variance_alert'
  | 'change_order_created'
  | 'change_order_updated'
  | 'daily_summary'
  | 'weekly_summary'
  | 'milestone_alert'
  | 'budget_exceeded'

export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'retrying'
export type QueueStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

export interface NotificationContextData {
  [key: string]: any
  variance_percentage?: number
  total_estimated?: number
  total_actual?: number
  total_variance?: number
  threshold?: number
  milestone_percentage?: number
  job_name?: string
  client_name?: string
  scope_item?: string
  change_order_details?: Record<string, any>
  summary_data?: Record<string, any>
}

export interface EmailTemplate {
  name: string
  subject: string
  htmlContent: string
  textContent: string
}

export interface NotificationSettingsForm {
  variance_alerts_enabled: boolean
  variance_threshold_percentage: number
  change_order_notifications_enabled: boolean
  daily_summary_enabled: boolean
  weekly_summary_enabled: boolean
  milestone_alerts_enabled: boolean
  milestone_thresholds: number[]
  email_address: string
  timezone: string
}

export interface NotificationStats {
  total_sent: number
  total_failed: number
  total_pending: number
  recent_notifications: NotificationLog[]
  notification_types: {
    [key in NotificationType]?: number
  }
}

// Photo Attachments Types

export interface ScopeItemPhoto {
  id: string
  scope_item_id: string
  user_id: string

  // File information
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
  file_hash: string

  // Photo metadata
  title?: string
  description?: string
  photo_type: PhotoType
  is_before_after_pair: boolean
  paired_photo_id?: string

  // Image properties
  width?: number
  height?: number
  aspect_ratio?: number
  dominant_color?: string

  // GPS and location data
  latitude?: number
  longitude?: number
  location_name?: string

  // Status and organization
  is_primary: boolean
  is_public: boolean
  sort_order: number

  // Metadata
  taken_at?: string
  uploaded_at: string
  created_at: string
  updated_at: string
}

export interface PhotoAnnotation {
  id: string
  photo_id: string
  user_id: string
  annotation_type: AnnotationType
  coordinates: any
  text_content?: string
  color: string
  stroke_width: number
  created_at: string
  updated_at: string
}

export type PhotoType =
  | 'progress'
  | 'before'
  | 'after'
  | 'completion'
  | 'issue'
  | 'reference'

export type AnnotationType =
  | 'arrow'
  | 'circle'
  | 'rectangle'
  | 'text'
  | 'measurement'
  | 'pin'

// Database function parameters
export interface QueueNotificationParams {
  user_id: string
  job_id?: string | null
  notification_type: NotificationType
  context_data: NotificationContextData
  priority?: number
  scheduled_at?: string
}

export interface SetPrimaryPhotoParams {
  photo_id: string
}

export interface PairBeforeAfterParams {
  before_photo_id: string
  after_photo_id: string
}

export interface GetScopeItemPhotosParams {
  scope_item_id: string
}

export interface GetJobPhotoStatsParams {
  job_id: string
}

// =============================================
// RBAC System Types
// =============================================

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
  resource: string
  action: string
  description: string | null
  created_at: string
}

export interface RolePermission {
  id: string
  role_id: string
  permission_id: string
  created_at: string
}

export interface UserRole {
  id: string
  user_id: string
  role_id: string
  assigned_by: string | null
  assigned_at: string
  is_active: boolean
  role?: Role
}

export interface JobRoleAssignment {
  id: string
  job_id: string
  user_id: string
  role_id: string
  assigned_by: string | null
  assigned_at: string
  is_active: boolean
  role?: Role
  user?: {
    id: string
    email: string
    user_metadata?: {
      full_name?: string
      name?: string
      avatar_url?: string
    }
  }
}

export interface UserPermission {
  permission_id: string
  permission_name: string
  resource: string
  action: string
  role_name: string
  is_job_specific: boolean
}

// Role definitions
export type RoleName = 'owner' | 'project_manager' | 'foreman' | 'viewer'

export interface RoleHierarchy {
  [key: string]: {
    level: number
    displayName: string
    description: string
    permissions: string[]
  }
}

// Permission checking utilities
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
  assignments: Array<{
    user_id: string
    role_id: string
  }>
}

// Form types for RBAC interfaces
export interface UserRoleForm {
  user_id: string
  role_id: string
  is_active: boolean
}

export interface JobRoleAssignmentForm {
  job_id: string
  user_id: string
  role_id: string
}

export interface UserWithRoles {
  id: string
  email: string
  user_metadata?: {
    full_name?: string
    name?: string
    avatar_url?: string
  }
  global_roles: Role[]
  job_roles: Array<{
    job_id: string
    job_name: string
    role: Role
  }>
}

// Database function parameter types
export interface UserHasPermissionParams {
  user_uuid: string
  permission_name: string
  job_uuid?: string
}

export interface GetUserPermissionsParams {
  user_uuid: string
  job_uuid?: string
}

export interface GetUserMaxRoleLevelParams {
  user_uuid: string
  job_uuid?: string
}

// Constants
export const SYSTEM_ROLES: RoleName[] = ['owner', 'project_manager', 'foreman', 'viewer']

export const ROLE_HIERARCHY: RoleHierarchy = {
  owner: {
    level: 100,
    displayName: 'Owner',
    description: 'Full system access and user management',
    permissions: ['*'] // All permissions
  },
  project_manager: {
    level: 80,
    displayName: 'Project Manager',
    description: 'Can manage jobs, budgets, and approve change orders',
    permissions: [
      'jobs.create', 'jobs.read', 'jobs.update', 'jobs.assign_roles',
      'budgets.create', 'budgets.read', 'budgets.update', 'budgets.approve',
      'scope_items.create', 'scope_items.read', 'scope_items.update', 'scope_items.complete',
      'photos.create', 'photos.read', 'photos.update'
    ]
  },
  foreman: {
    level: 60,
    displayName: 'Foreman',
    description: 'Can update progress, add photos, submit change orders',
    permissions: [
      'jobs.read',
      'budgets.read',
      'scope_items.create', 'scope_items.read', 'scope_items.update', 'scope_items.complete',
      'photos.create', 'photos.read', 'photos.update', 'photos.annotate'
    ]
  },
  viewer: {
    level: 20,
    displayName: 'Viewer',
    description: 'Read-only access to assigned jobs',
    permissions: [
      'jobs.read',
      'budgets.read',
      'scope_items.read',
      'photos.read'
    ]
  }
}