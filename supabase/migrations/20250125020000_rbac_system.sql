-- Role-Based Access Control (RBAC) System Migration

-- =============================================
-- RBAC Core Tables
-- =============================================

-- Roles table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  level INT NOT NULL DEFAULT 0, -- Higher number = more privileges
  is_system_role BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissions table
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  resource TEXT NOT NULL, -- e.g., 'jobs', 'budgets', 'scope_items', 'photos'
  action TEXT NOT NULL, -- e.g., 'create', 'read', 'update', 'delete', 'approve'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Role_Permissions junction table
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- User_Roles junction table (global role assignments)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, role_id)
);

-- Job_Role_Assignments table (job-specific role assignments)
CREATE TABLE job_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(job_id, user_id, role_id)
);

-- =============================================
-- Indexes for Performance
-- =============================================

CREATE INDEX idx_roles_level ON roles(level DESC);
CREATE INDEX idx_permissions_resource_action ON permissions(resource, action);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
CREATE INDEX idx_job_role_assignments_job ON job_role_assignments(job_id);
CREATE INDEX idx_job_role_assignments_user ON job_role_assignments(user_id);
CREATE INDEX idx_job_role_assignments_role ON job_role_assignments(role_id);

-- =============================================
-- Row-Level Security (RLS) Policies
-- =============================================

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_role_assignments ENABLE ROW LEVEL SECURITY;

-- Roles: Everyone can read, only system admin can modify
CREATE POLICY "Anyone can read roles" ON roles
  FOR SELECT USING (true);

CREATE POLICY "System admins can manage roles" ON roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND r.name = 'owner'
    )
  );

-- Permissions: Everyone can read
CREATE POLICY "Anyone can read permissions" ON permissions
  FOR SELECT USING (true);

-- Role_Permissions: Readable by all, manageable by admins
CREATE POLICY "Anyone can read role permissions" ON role_permissions
  FOR SELECT USING (true);

CREATE POLICY "System admins can manage role permissions" ON role_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND r.name = 'owner'
    )
  );

-- User_Roles: Users can see their own roles, admins can manage all
CREATE POLICY "Users can see own roles" ON user_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage user roles" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND r.name IN ('owner', 'project_manager')
    )
  );

-- Job_Role_Assignments: Users can see job roles they're assigned to or jobs they own
CREATE POLICY "Users can see job roles they're involved in" ON job_role_assignments
  FOR SELECT USING (
    user_id = auth.uid()
    OR job_id IN (
      SELECT id FROM jobs WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND r.name IN ('owner', 'project_manager')
    )
  );

CREATE POLICY "Job owners and admins can manage job roles" ON job_role_assignments
  FOR ALL USING (
    job_id IN (SELECT id FROM jobs WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND r.name IN ('owner', 'project_manager')
    )
  );

-- =============================================
-- RBAC Helper Functions
-- =============================================

-- Function to check if a user has a specific permission
CREATE OR REPLACE FUNCTION user_has_permission(
  user_uuid UUID,
  permission_name TEXT,
  job_uuid UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  has_perm BOOLEAN := FALSE;
BEGIN
  -- Check global permissions first
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = user_uuid
    AND ur.is_active = true
    AND p.name = permission_name
  ) INTO has_perm;

  -- If no global permission and job is specified, check job-specific permissions
  IF NOT has_perm AND job_uuid IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM job_role_assignments jra
      JOIN role_permissions rp ON jra.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE jra.user_id = user_uuid
      AND jra.job_id = job_uuid
      AND jra.is_active = true
      AND p.name = permission_name
    ) INTO has_perm;
  END IF;

  RETURN has_perm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's highest role level
CREATE OR REPLACE FUNCTION get_user_max_role_level(user_uuid UUID, job_uuid UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  max_level INTEGER;
BEGIN
  IF job_uuid IS NOT NULL THEN
    -- Check job-specific roles first
    SELECT COALESCE(MAX(r.level), 0) INTO max_level
    FROM job_role_assignments jra
    JOIN roles r ON jra.role_id = r.id
    WHERE jra.user_id = user_uuid
    AND jra.job_id = job_uuid
    AND jra.is_active = true;

    -- If no job role, fall back to global role
    IF max_level = 0 THEN
      SELECT COALESCE(MAX(r.level), 0) INTO max_level
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = user_uuid
      AND ur.is_active = true;
    END IF;
  ELSE
    -- Only check global roles
    SELECT COALESCE(MAX(r.level), 0) INTO max_level
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid
    AND ur.is_active = true;
  END IF;

  RETURN max_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all permissions for a user (global + job-specific)
CREATE OR REPLACE FUNCTION get_user_permissions(
  user_uuid UUID,
  job_uuid UUID DEFAULT NULL
)
RETURNS TABLE(
  permission_id UUID,
  permission_name TEXT,
  resource TEXT,
  action TEXT,
  role_name TEXT,
  is_job_specific BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  -- Global permissions
  SELECT
    p.id as permission_id,
    p.name as permission_name,
    p.resource,
    p.action,
    r.name as role_name,
    false as is_job_specific
  FROM user_roles ur
  JOIN role_permissions rp ON ur.role_id = rp.role_id
  JOIN permissions p ON rp.permission_id = p.id
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = user_uuid
  AND ur.is_active = true

  UNION ALL

  -- Job-specific permissions (if job_uuid is provided)
  SELECT
    p.id as permission_id,
    p.name as permission_name,
    p.resource,
    p.action,
    r.name as role_name,
    true as is_job_specific
  FROM job_role_assignments jra
  JOIN role_permissions rp ON jra.role_id = rp.role_id
  JOIN permissions p ON rp.permission_id = p.id
  JOIN roles r ON jra.role_id = r.id
  WHERE jra.user_id = user_uuid
  AND jra.job_id = job_uuid
  AND jra.is_active = true
  ;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Updated RLS Policies for Existing Tables
-- =============================================

-- Update Jobs RLS to respect RBAC
DROP POLICY IF EXISTS "Users see own jobs" ON jobs;

CREATE POLICY "Jobs access based on RBAC" ON jobs
  FOR ALL USING (
    -- Job owners always have access
    user_id = auth.uid()
    OR user_has_permission(auth.uid(), 'jobs.read', id)
    OR user_has_permission(auth.uid(), 'jobs.read_all')
  );

-- Update Budget Versions RLS
DROP POLICY IF EXISTS "Users access own budget versions" ON budget_versions;

CREATE POLICY "Budget versions access based on RBAC" ON budget_versions
  FOR ALL USING (
    -- Access through job ownership
    job_id IN (SELECT id FROM jobs WHERE user_id = auth.uid())
    -- Access through RBAC
    OR user_has_permission(auth.uid(), 'budgets.read', job_id)
    OR user_has_permission(auth.uid(), 'budgets.read_all')
  );

-- Update Scope Items RLS
DROP POLICY IF EXISTS "Users access own scope items" ON scope_items;

CREATE POLICY "Scope items access based on RBAC" ON scope_items
  FOR ALL USING (
    -- Access through job ownership
    budget_version_id IN (
      SELECT bv.id FROM budget_versions bv
      JOIN jobs j ON j.id = bv.job_id
      WHERE j.user_id = auth.uid()
    )
    -- Access through RBAC
    OR EXISTS (
      SELECT 1 FROM budget_versions bv
      JOIN jobs j ON j.id = bv.job_id
      WHERE bv.id = scope_items.budget_version_id
      AND (user_has_permission(auth.uid(), 'scope_items.read', j.id)
           OR user_has_permission(auth.uid(), 'scope_items.read_all'))
    )
  );

-- =============================================
-- Seed Data for Roles and Permissions
-- =============================================

-- Insert system roles
INSERT INTO roles (name, display_name, description, level, is_system_role) VALUES
('owner', 'Owner', 'Full system access and user management', 100, true),
('project_manager', 'Project Manager', 'Can manage jobs, budgets, and approve change orders', 80, true),
('foreman', 'Foreman', 'Can update progress, add photos, submit change orders', 60, true),
('viewer', 'Viewer', 'Read-only access to assigned jobs', 20, true);

-- Insert permissions
INSERT INTO permissions (name, resource, action, description) VALUES
-- Job permissions
('jobs.create', 'jobs', 'create', 'Create new jobs'),
('jobs.read', 'jobs', 'read', 'View job details'),
('jobs.read_all', 'jobs', 'read_all', 'View all jobs in system'),
('jobs.update', 'jobs', 'update', 'Edit job details'),
('jobs.delete', 'jobs', 'delete', 'Delete jobs'),
('jobs.assign_roles', 'jobs', 'assign_roles', 'Assign roles to jobs'),

-- Budget permissions
('budgets.create', 'budgets', 'create', 'Create budget versions'),
('budgets.read', 'budgets', 'read', 'View budget details'),
('budgets.read_all', 'budgets', 'read_all', 'View all budgets'),
('budgets.update', 'budgets', 'update', 'Edit budget details'),
('budgets.approve', 'budgets', 'approve', 'Approve budget changes'),
('budgets.delete', 'budgets', 'delete', 'Delete budget versions'),

-- Scope item permissions
('scope_items.create', 'scope_items', 'create', 'Create scope items'),
('scope_items.read', 'scope_items', 'read', 'View scope items'),
('scope_items.read_all', 'scope_items', 'read_all', 'View all scope items'),
('scope_items.update', 'scope_items', 'update', 'Edit scope items'),
('scope_items.delete', 'scope_items', 'delete', 'Delete scope items'),
('scope_items.complete', 'scope_items', 'complete', 'Mark scope items as complete'),

-- Photo permissions
('photos.create', 'photos', 'create', 'Upload photos'),
('photos.read', 'photos', 'read', 'View photos'),
('photos.read_all', 'photos', 'read_all', 'View all photos'),
('photos.update', 'photos', 'update', 'Edit photo details'),
('photos.delete', 'photos', 'delete', 'Delete photos'),
('photos.annotate', 'photos', 'annotate', 'Add annotations to photos'),

-- System permissions
('users.manage', 'users', 'manage', 'Manage user accounts and roles'),
('system.admin', 'system', 'admin', 'System administration');

-- Insert role permissions mappings

-- Owner gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'owner';

-- Project Manager permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'project_manager'
AND p.name IN (
  'jobs.create', 'jobs.read', 'jobs.update', 'jobs.assign_roles',
  'budgets.create', 'budgets.read', 'budgets.update', 'budgets.approve',
  'scope_items.create', 'scope_items.read', 'scope_items.update', 'scope_items.complete',
  'photos.create', 'photos.read', 'photos.update'
);

-- Foreman permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'foreman'
AND p.name IN (
  'jobs.read',
  'budgets.read',
  'scope_items.create', 'scope_items.read', 'scope_items.update', 'scope_items.complete',
  'photos.create', 'photos.read', 'photos.update', 'photos.annotate'
);

-- Viewer permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'viewer'
AND p.name IN (
  'jobs.read',
  'budgets.read',
  'scope_items.read',
  'photos.read'
);

-- =============================================
-- Triggers for updated_at columns
-- =============================================

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();