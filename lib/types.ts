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
