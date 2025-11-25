import { UUID } from './common';

// Schedule Types
export interface Schedule {
  id: UUID;
  job_id: UUID;
  name: string;
  description?: string;
  start_date: string;
  end_date?: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  created_by?: UUID;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: UUID;
  schedule_id: UUID;
  scope_item_id?: UUID;
  name: string;
  description?: string;
  type: 'task' | 'milestone' | 'summary';
  status: 'not_started' | 'in_progress' | 'completed' | 'delayed' | 'blocked';
  priority: 'low' | 'normal' | 'high' | 'critical';

  // Scheduling data
  planned_start_date?: string;
  planned_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  duration_days: number;
  progress_percentage: number;

  // Hierarchy
  parent_task_id?: UUID;
  sort_order: number;
  is_critical_path: boolean;

  // Cost tracking
  estimated_cost: number;
  actual_cost: number;

  created_at: string;
  updated_at: string;

  // Computed properties (not stored in DB)
  children?: Task[];
  parent?: Task;
  assignments?: TaskAssignment[];
  dependencies?: TaskDependency[];
  predecessors?: Task[];
  successors?: Task[];
  slack_days?: number;
  early_start?: string;
  early_finish?: string;
  late_start?: string;
  late_finish?: string;
}

export interface TaskDependency {
  id: UUID;
  predecessor_id: UUID;
  successor_id: UUID;
  dependency_type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
  lag_days: number;
  created_at: string;

  // Computed properties
  predecessor?: Task;
  successor?: Task;
}

export interface Resource {
  id: UUID;
  job_id: UUID;
  name: string;
  type: 'person' | 'equipment' | 'material' | 'space';
  description?: string;
  capacity_per_day: number;
  cost_per_unit: number;
  available_from?: string;
  available_to?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Computed properties
  assignments?: TaskAssignment[];
  utilization?: number;
  conflicts?: ResourceConflict[];
}

export interface TaskAssignment {
  id: UUID;
  task_id: UUID;
  resource_id: UUID;
  allocation_percentage: number;
  assigned_quantity: number;
  notes?: string;
  created_at: string;
  updated_at: string;

  // Computed properties
  task?: Task;
  resource?: Resource;
}

export interface ScheduleScenario {
  id: UUID;
  schedule_id: UUID;
  name: string;
  description?: string;
  is_active: boolean;
  created_by?: UUID;
  created_at: string;

  // Computed properties
  tasks?: ScenarioTask[];
  schedule?: Schedule;
}

export interface ScenarioTask {
  id: UUID;
  scenario_id: UUID;
  task_id: UUID;
  planned_start_date?: string;
  planned_end_date?: string;
  duration_days?: number;
  assigned_resources?: Record<string, any>; // JSON data

  created_at: string;

  // Computed properties
  scenario?: ScheduleScenario;
  original_task?: Task;
}

export interface TaskChange {
  id: UUID;
  task_id: UUID;
  changed_by?: UUID;
  change_type: 'created' | 'updated' | 'deleted' | 'status_changed' |
              'dates_changed' | 'dependency_added' | 'dependency_removed' |
              'resource_assigned' | 'resource_unassigned';
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  notes?: string;
  created_at: string;

  // Computed properties
  task?: Task;
  changed_by_user?: any;
}

// API Request/Response Types
export interface CreateScheduleRequest {
  job_id: UUID;
  name?: string;
  description?: string;
  start_date: string;
  end_date?: string;
}

export interface UpdateScheduleRequest {
  name?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status?: Schedule['status'];
}

export interface CreateTaskRequest {
  schedule_id: UUID;
  scope_item_id?: UUID;
  name: string;
  description?: string;
  type?: Task['type'];
  priority?: Task['priority'];
  planned_start_date?: string;
  planned_end_date?: string;
  duration_days?: number;
  parent_task_id?: UUID;
  sort_order?: number;
  estimated_cost?: number;
}

export interface UpdateTaskRequest {
  name?: string;
  description?: string;
  type?: Task['type'];
  status?: Task['status'];
  priority?: Task['priority'];
  planned_start_date?: string;
  planned_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  duration_days?: number;
  progress_percentage?: number;
  parent_task_id?: UUID;
  sort_order?: number;
  estimated_cost?: number;
  actual_cost?: number;
}

export interface CreateDependencyRequest {
  predecessor_id: UUID;
  successor_id: UUID;
  dependency_type?: TaskDependency['dependency_type'];
  lag_days?: number;
}

export interface CreateResourceRequest {
  job_id: UUID;
  name: string;
  type: Resource['type'];
  description?: string;
  capacity_per_day?: number;
  cost_per_unit?: number;
  available_from?: string;
  available_to?: string;
}

export interface CreateAssignmentRequest {
  task_id: UUID;
  resource_id: UUID;
  allocation_percentage?: number;
  assigned_quantity?: number;
  notes?: string;
}

export interface UpdateAssignmentRequest {
  allocation_percentage?: number;
  assigned_quantity?: number;
  notes?: string;
}

export interface ResourceConflict {
  task_id: UUID;
  task_name: string;
  conflict_start: string;
  conflict_end: string;
  conflict_percentage: number;
}

export interface CriticalPathItem {
  task_id: UUID;
  task_name: string;
  start_date: string;
  end_date: string;
  duration: number;
  is_critical: boolean;
  slack_days: number;
}

export interface ProjectTimelineSummary {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  not_started_tasks: number;
  delayed_tasks: number;
  progress_percentage: number;
  planned_start?: string;
  planned_end?: string;
  actual_start?: string;
  actual_end?: string;
}

// Gantt Chart Types
export interface GanttTask {
  id: UUID;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  dependencies: UUID[];
  type: Task['type'];
  status: Task['status'];
  priority: Task['priority'];
  assignee?: string;
  color?: string;
  children?: GanttTask[];
  expanded?: boolean;
  movable?: boolean;
  resizable?: boolean;
  connectable?: boolean;
}

export interface GanttResource {
  id: UUID;
  name: string;
  type: Resource['type'];
  allocations: GanttResourceAllocation[];
}

export interface GanttResourceAllocation {
  task_id: UUID;
  task_name: string;
  start: Date;
  end: Date;
  allocation: number;
  color?: string;
}

export interface GanttViewMode {
  mode: 'day' | 'week' | 'month' | 'quarter';
  step: number;
}

export interface GanttDateRange {
  start: Date;
  end: Date;
}

// Timeline View Types
export interface TimelineView {
  scale: 'day' | 'week' | 'month';
  currentDate: Date;
  visibleStart: Date;
  visibleEnd: Date;
  workingDays: number[];
  workingHours: {
    start: number;
    end: number;
  };
}

// Resource Heatmap Types
export interface ResourceHeatmapData {
  resource_id: UUID;
  resource_name: string;
  dates: {
    date: string;
    utilization: number;
    allocated_tasks: number;
    available_capacity: number;
    conflicts: number;
  }[];
}

// What-if Scenario Types
export interface ScenarioComparison {
  original: {
    duration: number;
    cost: number;
    end_date: string;
    resource_utilization: Record<UUID, number>;
  };
  scenario: {
    duration: number;
    cost: number;
    end_date: string;
    resource_utilization: Record<UUID, number>;
  };
  changes: {
    duration_change: number;
    cost_change: number;
    end_date_change: string;
    critical_path_changes: UUID[];
    resource_conflicts: ResourceConflict[];
  };
}

// Calendar Integration Types
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  description?: string;
  location?: string;
  attendees?: string[];
  taskId?: UUID;
  calendarId?: string;
}

export interface CalendarIntegration {
  id: UUID;
  job_id: UUID;
  provider: 'google' | 'outlook' | 'apple';
  calendar_id: string;
  sync_enabled: boolean;
  last_sync_at?: string;
  access_token?: string;
  refresh_token?: string;
  created_at: string;
  updated_at: string;
}

// Scheduling Engine Types
export interface SchedulingOptions {
  workingDays: number[];
  workingHours: {
    start: number;
    end: number;
  };
  holidays: string[];
  weekendsExcluded: boolean;
  autoLevelResources: boolean;
  considerDependencies: boolean;
}

export interface SchedulingResult {
  success: boolean;
  tasks: Task[];
  conflicts: ResourceConflict[];
  warnings: string[];
  criticalPath: CriticalPathItem[];
  summary: {
    totalDuration: number;
    estimatedCost: number;
    resourceUtilization: Record<UUID, number>;
  };
}

export interface DragDropOperation {
  type: 'move' | 'resize' | 'link';
  taskId: UUID;
  startDate?: Date;
  endDate?: Date;
  newParentId?: UUID;
  linkedTaskId?: UUID;
  dependencyType?: TaskDependency['dependency_type'];
}

// Export all scheduling types
export type {
  Schedule,
  Task,
  TaskDependency,
  Resource,
  TaskAssignment,
  ScheduleScenario,
  ScenarioTask,
  TaskChange,
  ResourceConflict,
  CriticalPathItem,
  ProjectTimelineSummary,
  GanttTask,
  GanttResource,
  GanttResourceAllocation,
  GanttViewMode,
  GanttDateRange,
  TimelineView,
  ResourceHeatmapData,
  ScenarioComparison,
  CalendarEvent,
  CalendarIntegration,
  SchedulingOptions,
  SchedulingResult,
  DragDropOperation,
  CreateScheduleRequest,
  UpdateScheduleRequest,
  CreateTaskRequest,
  UpdateTaskRequest,
  CreateDependencyRequest,
  CreateResourceRequest,
  CreateAssignmentRequest,
  UpdateAssignmentRequest,
};