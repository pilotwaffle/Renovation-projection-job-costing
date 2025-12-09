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

export interface BudgetTotals {
  total_estimated: number
  total_actual: number
  total_variance: number
  variance_percentage: number
}

export interface BudgetTemplate {
  id: string
  user_id: string
  name: string
  description: string | null
  is_public: boolean
  use_count: number
  created_at: string
  updated_at: string
}

export interface TemplateItem {
  id: string
  template_id: string
  category_id: string | null
  description: string
  estimated_material_cost: number
  estimated_labor_hours: number
  estimated_labor_rate: number
  notes: string | null
  sort_order: number | null
  created_at: string
}

export interface TemplateItemWithCategory extends TemplateItem {
  category: Category | null
}

export interface BudgetTemplateWithItems extends BudgetTemplate {
  template_items: TemplateItemWithCategory[]
  estimated_total?: number
}

export interface ChangeOrder {
  id: string
  job_id: string
  title: string
  description: string | null
  status: 'pending' | 'approved' | 'rejected' | 'implemented'
  impact_amount: number
  requested_by: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

export interface ChangeOrderItem {
  id: string
  change_order_id: string
  scope_item_id: string | null
  change_type: 'add' | 'modify' | 'remove'
  description: string
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  cost_impact: number
  created_at: string
}

export interface ChangeOrderWithItems extends ChangeOrder {
  items: ChangeOrderItem[]
}

export * from './types/rbac'
