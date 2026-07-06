-- Change Orders Migration
-- Track scope changes with approval workflow

CREATE TABLE change_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'implemented')),
  impact_amount NUMERIC(10,2) DEFAULT 0,
  requested_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE change_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_order_id UUID REFERENCES change_orders(id) ON DELETE CASCADE NOT NULL,
  scope_item_id UUID REFERENCES scope_items(id) ON DELETE SET NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('add', 'modify', 'remove')),
  description TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  cost_impact NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_change_orders_job ON change_orders(job_id, created_at DESC);
CREATE INDEX idx_change_orders_status ON change_orders(status);
CREATE INDEX idx_change_order_items_co ON change_order_items(change_order_id);

-- RLS Policies
ALTER TABLE change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own change orders" ON change_orders
  FOR ALL USING (
    job_id IN (SELECT id FROM jobs WHERE user_id = auth.uid())
  );

CREATE POLICY "Users access own change order items" ON change_order_items
  FOR ALL USING (
    change_order_id IN (
      SELECT co.id FROM change_orders co
      JOIN jobs j ON j.id = co.job_id
      WHERE j.user_id = auth.uid()
    )
  );
