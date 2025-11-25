// Main scheduling components
export { Scheduler } from './Scheduler';
export { GanttChart } from './GanttChart';
export { TaskList } from './TaskList';
export { ResourceAllocation } from './ResourceAllocation';
export { Timeline } from './Timeline';

// Scheduling engine exports
export { schedulingEngine } from '@/lib/scheduling/scheduler';
export { TaskManager } from '@/lib/scheduling/taskManager';
export { ResourceManager } from '@/lib/scheduling/resourceManager';
export { CriticalPathAnalyzer } from '@/lib/scheduling/criticalPath';
export { GanttChartProcessor } from '@/lib/scheduling/ganttChart';

// Types exports
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
} from '@/types/scheduling';