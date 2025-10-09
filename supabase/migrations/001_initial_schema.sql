-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Jobs table (main entity)
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  client_name TEXT,
  address TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget versions (immutable for audit trail)
CREATE TABLE budget_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  version INT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(job_id, version)
);

-- Categories (standardized for reporting)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  sort_order INT,
  color TEXT -- Hex color for UI
);

-- Scope items (budget line items)
CREATE TABLE scope_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_version_id UUID REFERENCES budget_versions(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id),
  description TEXT NOT NULL,

  -- Estimated costs
  estimated_material_cost NUMERIC(10,2) DEFAULT 0 CHECK (estimated_material_cost >= 0),
  estimated_labor_hours NUMERIC(7,2) DEFAULT 0 CHECK (estimated_labor_hours >= 0),
  estimated_labor_rate NUMERIC(8,2) DEFAULT 50.00,

  -- Actual costs
  actual_material_cost NUMERIC(10,2) DEFAULT 0 CHECK (actual_material_cost >= 0),
  actual_labor_hours NUMERIC(7,2) DEFAULT 0 CHECK (actual_labor_hours >= 0),

  -- Metadata
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_jobs_user ON jobs(user_id, created_at DESC);
CREATE INDEX idx_budget_versions_job ON budget_versions(job_id, version DESC);
CREATE INDEX idx_scope_items_budget ON scope_items(budget_version_id);
CREATE INDEX idx_scope_items_category ON scope_items(category_id);

-- Row-Level Security (RLS) policies
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Users can only see their own jobs
CREATE POLICY "Users see own jobs" ON jobs
  FOR ALL USING (user_id = auth.uid());

-- Users can access budget versions for their jobs
CREATE POLICY "Users access own budget versions" ON budget_versions
  FOR ALL USING (
    job_id IN (SELECT id FROM jobs WHERE user_id = auth.uid())
  );

-- Users can access scope items for their budgets
CREATE POLICY "Users access own scope items" ON scope_items
  FOR ALL USING (
    budget_version_id IN (
      SELECT bv.id FROM budget_versions bv
      JOIN jobs j ON j.id = bv.job_id
      WHERE j.user_id = auth.uid()
    )
  );

-- Categories are public (all users can read)
CREATE POLICY "Anyone can read categories" ON categories
  FOR SELECT USING (true);

-- Postgres functions for calculations
CREATE OR REPLACE FUNCTION calculate_variance(scope_item_id UUID)
RETURNS NUMERIC AS $$
  SELECT
    (actual_material_cost + (actual_labor_hours * estimated_labor_rate)) -
    (estimated_material_cost + (estimated_labor_hours * estimated_labor_rate))
  FROM scope_items
  WHERE id = scope_item_id;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION calculate_budget_totals(budget_version_uuid UUID)
RETURNS TABLE(
  total_estimated NUMERIC,
  total_actual NUMERIC,
  total_variance NUMERIC,
  variance_percentage NUMERIC
) AS $$
  SELECT
    SUM(estimated_material_cost + (estimated_labor_hours * estimated_labor_rate)) AS total_estimated,
    SUM(actual_material_cost + (actual_labor_hours * estimated_labor_rate)) AS total_actual,
    SUM(actual_material_cost + (actual_labor_hours * estimated_labor_rate)) -
      SUM(estimated_material_cost + (estimated_labor_hours * estimated_labor_rate)) AS total_variance,
    CASE
      WHEN SUM(estimated_material_cost + (estimated_labor_hours * estimated_labor_rate)) > 0
      THEN (SUM(actual_material_cost + (actual_labor_hours * estimated_labor_rate)) -
            SUM(estimated_material_cost + (estimated_labor_hours * estimated_labor_rate))) /
            SUM(estimated_material_cost + (estimated_labor_hours * estimated_labor_rate)) * 100
      ELSE 0
    END AS variance_percentage
  FROM scope_items
  WHERE budget_version_id = budget_version_uuid;
$$ LANGUAGE SQL STABLE;

-- Seed data for categories
INSERT INTO categories (name, sort_order, color) VALUES
  ('Demo', 1, '#ef4444'),
  ('Framing', 2, '#f59e0b'),
  ('Electrical', 3, '#3b82f6'),
  ('Plumbing', 4, '#10b981'),
  ('HVAC', 5, '#8b5cf6'),
  ('Insulation', 6, '#ec4899'),
  ('Drywall', 7, '#6366f1'),
  ('Flooring', 8, '#14b8a6'),
  ('Cabinets', 9, '#f97316'),
  ('Countertops', 10, '#06b6d4'),
  ('Painting', 11, '#84cc16'),
  ('Trim', 12, '#a3e635'),
  ('Fixtures', 13, '#facc15'),
  ('Landscaping', 14, '#22c55e'),
  ('Other', 15, '#64748b');

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scope_items_updated_at BEFORE UPDATE ON scope_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
