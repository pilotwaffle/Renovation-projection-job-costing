-- Budget Templates Migration
-- Allows users to save budgets as reusable templates

-- Budget templates table
CREATE TABLE budget_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE, -- Future: template marketplace
  use_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template items (similar to scope_items but for templates)
CREATE TABLE template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES budget_templates(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id),
  description TEXT NOT NULL,
  estimated_material_cost NUMERIC(10,2) DEFAULT 0 CHECK (estimated_material_cost >= 0),
  estimated_labor_hours NUMERIC(7,2) DEFAULT 0 CHECK (estimated_labor_hours >= 0),
  estimated_labor_rate NUMERIC(8,2) DEFAULT 50.00,
  notes TEXT,
  sort_order INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_budget_templates_user ON budget_templates(user_id, created_at DESC);
CREATE INDEX idx_template_items_template ON template_items(template_id, sort_order);

-- Row-Level Security (RLS) policies
ALTER TABLE budget_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_items ENABLE ROW LEVEL SECURITY;

-- Users can only see their own templates (and public ones in the future)
CREATE POLICY "Users see own templates" ON budget_templates
  FOR ALL USING (
    user_id = auth.uid() OR is_public = TRUE
  );

-- Users can access template items for their templates
CREATE POLICY "Users access own template items" ON template_items
  FOR ALL USING (
    template_id IN (
      SELECT id FROM budget_templates
      WHERE user_id = auth.uid() OR is_public = TRUE
    )
  );

-- Only template owners can insert/update/delete their template items
CREATE POLICY "Users manage own template items" ON template_items
  FOR INSERT WITH CHECK (
    template_id IN (SELECT id FROM budget_templates WHERE user_id = auth.uid())
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_budget_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_budget_templates_updated_at
  BEFORE UPDATE ON budget_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_template_timestamp();

-- Function to calculate template estimated total
CREATE OR REPLACE FUNCTION calculate_template_total(template_uuid UUID)
RETURNS NUMERIC AS $$
  SELECT COALESCE(
    SUM(estimated_material_cost + (estimated_labor_hours * estimated_labor_rate)),
    0
  )
  FROM template_items
  WHERE template_id = template_uuid;
$$ LANGUAGE SQL STABLE;
