import {
  Task,
  TaskDependency,
  Resource,
  TaskAssignment,
  GanttTask,
  GanttResource,
  GanttResourceAllocation,
  GanttViewMode,
  GanttDateRange,
  TimelineView,
  UUID
} from '@/types/scheduling';
import {
  addDays,
  differenceInDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  isSameDay,
  isWithinInterval,
  format
} from 'date-fns';

/**
 * Gantt Chart Data Processor
 * Converts scheduling data into format suitable for Gantt chart visualization
 */
export class GanttChartProcessor {
  /**
   * Convert tasks to Gantt chart format
   */
  public static processTasks(
    tasks: Task[],
    dependencies: TaskDependency[],
    resources: Resource[],
    assignments: TaskAssignment[]
  ): GanttTask[] {
    // Build task hierarchy
    const hierarchy = this.buildTaskHierarchy(tasks);

    // Convert root tasks to Gantt format
    const ganttTasks: GanttTask[] = [];
    const rootTasks = hierarchy.get('root') || [];

    rootTasks.forEach(rootTask => {
      const ganttTask = this.convertTaskToGantt(rootTask, hierarchy, dependencies, resources, assignments);
      ganttTasks.push(ganttTask);
    });

    return ganttTasks;
  }

  /**
   * Convert a single task to Gantt format with children
   */
  private static convertTaskToGantt(
    task: Task,
    hierarchy: Map<UUID, Task[]>,
    dependencies: TaskDependency[],
    resources: Resource[],
    assignments: TaskAssignment[]
  ): GanttTask {
    const startDate = task.planned_start_date ? new Date(task.planned_start_date) : new Date();
    const endDate = task.planned_end_date ? new Date(task.planned_end_date) : addDays(startDate, task.duration_days || 1);

    // Get task dependencies
    const taskDependencies = dependencies
      .filter(dep => dep.successor_id === task.id)
      .map(dep => dep.predecessor_id);

    // Get assigned resources/names
    const taskAssignments = assignments.filter(a => a.task_id === task.id);
    const assigneeNames = taskAssignments
      .map(assignment => {
        const resource = resources.find(r => r.id === assignment.resource_id);
        return resource?.name;
      })
      .filter(Boolean)
      .join(', ');

    // Get task color based on status and priority
    const color = this.getTaskColor(task);

    // Convert children
    const children = hierarchy.get(task.id) || [];
    const ganttChildren = children.map(child =>
      this.convertTaskToGantt(child, hierarchy, dependencies, resources, assignments)
    );

    return {
      id: task.id,
      name: task.name,
      start: startDate,
      end: endDate,
      progress: task.progress_percentage,
      dependencies: taskDependencies,
      type: task.type,
      status: task.status,
      priority: task.priority,
      assignee: assigneeNames,
      color,
      children: ganttChildren.length > 0 ? ganttChildren : undefined,
      expanded: true, // Default to expanded
      movable: task.type !== 'milestone',
      resizable: task.type !== 'milestone',
      connectable: true,
    };
  }

  /**
   * Build task hierarchy for processing
   */
  private static buildTaskHierarchy(tasks: Task[]): Map<UUID, Task[]> {
    const hierarchy = new Map<UUID, Task[]>();

    // Group by parent
    tasks.forEach(task => {
      const parentId = task.parent_task_id || 'root' as UUID;
      if (!hierarchy.has(parentId)) {
        hierarchy.set(parentId, []);
      }
      hierarchy.get(parentId)!.push(task);
    });

    // Sort children within each parent
    hierarchy.forEach(children => {
      children.sort((a, b) => a.sort_order - b.sort_order);
    });

    return hierarchy;
  }

  /**
   * Get color for task based on status and priority
   */
  private static getTaskColor(task: Task): string {
    const statusColors = {
      not_started: '#94a3b8', // slate-500
      in_progress: '#3b82f6', // blue-500
      completed: '#10b981', // emerald-500
      delayed: '#f59e0b', // amber-500
      blocked: '#ef4444', // red-500
    };

    const priorityColors = {
      low: '#10b981', // emerald-500
      normal: '#3b82f6', // blue-500
      high: '#f59e0b', // amber-500
      critical: '#ef4444', // red-500
    };

    // Use status color by default, override for high priority in-progress tasks
    if (task.status === 'in_progress' && task.priority === 'critical') {
      return priorityColors.critical;
    }

    return statusColors[task.status] || statusColors.not_started;
  }

  /**
   * Process resources for Gantt resource view
   */
  public static processResources(
    resources: Resource[],
    assignments: TaskAssignment[],
    tasks: Task[]
  ): GanttResource[] {
    return resources.map(resource => {
      const resourceAssignments = assignments.filter(a => a.resource_id === resource.id);
      const allocations: GanttResourceAllocation[] = [];

      resourceAssignments.forEach(assignment => {
        const task = tasks.find(t => t.id === assignment.task_id);
        if (!task || !task.planned_start_date || !task.planned_end_date) return;

        allocations.push({
          task_id: assignment.task_id,
          task_name: task.name,
          start: new Date(task.planned_start_date),
          end: new Date(task.planned_end_date),
          allocation: assignment.allocation_percentage,
          color: this.getResourceAllocationColor(assignment.allocation_percentage),
        });
      });

      return {
        id: resource.id,
        name: resource.name,
        type: resource.type,
        allocations,
      };
    });
  }

  /**
   * Get color for resource allocation based on percentage
   */
  private static getResourceAllocationColor(allocation: number): string {
    if (allocation > 100) return '#ef4444'; // red-500 (over-allocated)
    if (allocation > 80) return '#f59e0b'; // amber-500 (high allocation)
    if (allocation > 50) return '#3b82f6'; // blue-500 (medium allocation)
    return '#10b981'; // emerald-500 (low allocation)
  }

  /**
   * Generate timeline data for Gantt chart
   */
  public static generateTimelineData(
    startDate: Date,
    endDate: Date,
    viewMode: GanttViewMode
  ): {
    timeline: TimelineView;
    headerRows: Array<{
      label: string;
      dates: Date[];
      width: number;
    }>;
  } {
    const timeline: TimelineView = {
      scale: viewMode.mode as 'day' | 'week' | 'month',
      currentDate: new Date(),
      visibleStart: startDate,
      visibleEnd: endDate,
      workingDays: [1, 2, 3, 4, 5], // Monday to Friday
      workingHours: { start: 8, end: 17 },
    };

    const headerRows: Array<{ label: string; dates: Date[]; width: number }> = [];

    switch (viewMode.mode) {
      case 'day':
        headerRows.push({
          label: 'Days',
          dates: eachDayOfInterval({ start: startDate, end: endDate }),
          width: 40,
        });
        break;

      case 'week':
        const weeks = eachWeekOfInterval({ start: startDate, end: endDate });
        headerRows.push({
          label: 'Weeks',
          dates: weeks,
          width: 120,
        });

        // Add sub-header for days
        const daysInWeeks = weeks.map(week => eachDayOfInterval({
          start: week,
          end: addDays(week, 6)
        })).flat();

        headerRows.push({
          label: 'Days',
          dates: daysInWeeks,
          width: 20,
        });
        break;

      case 'month':
        const months = eachMonthOfInterval({ start: startDate, end: endDate });
        headerRows.push({
          label: 'Months',
          dates: months,
          width: 150,
        });

        // Add sub-header for weeks
        const weeksInMonths = months.map(month => eachWeekOfInterval({
          start: startOfMonth(month),
          end: endOfMonth(month)
        })).flat();

        headerRows.push({
          label: 'Weeks',
          dates: weeksInMonths,
          width: 40,
        });
        break;

      case 'quarter':
        const quarters = [startDate, ...Array.from({ length: Math.ceil(differenceInDays(endDate, startDate) / 90) })
          .map((_, i) => startOfQuarter(addDays(startDate, i * 90)))
        ].filter(q => q <= endDate);

        headerRows.push({
          label: 'Quarters',
          dates: quarters,
          width: 300,
        });

        // Add sub-header for months
        const monthsInQuarters = quarters.flatMap(quarter => eachMonthOfInterval({
          start: startOfQuarter(quarter),
          end: endOfQuarter(quarter)
        }));

        headerRows.push({
          label: 'Months',
          dates: monthsInQuarters,
          width: 50,
        });
        break;
    }

    return { timeline, headerRows };
  }

  /**
   * Calculate optimal date range for Gantt view
   */
  public static calculateOptimalDateRange(
    tasks: Task[],
    paddingDays: number = 7
  ): GanttDateRange {
    if (tasks.length === 0) {
      const today = new Date();
      return {
        start: addDays(today, -paddingDays),
        end: addDays(today, paddingDays * 2),
      };
    }

    const validTasks = tasks.filter(task => task.planned_start_date && task.planned_end_date);

    if (validTasks.length === 0) {
      const today = new Date();
      return {
        start: addDays(today, -paddingDays),
        end: addDays(today, paddingDays * 2),
      };
    }

    const earliestStart = validTasks.reduce((earliest, task) => {
      const startDate = new Date(task.planned_start_date!);
      return startDate < earliest ? startDate : earliest;
    }, new Date(validTasks[0].planned_start_date!));

    const latestEnd = validTasks.reduce((latest, task) => {
      const endDate = new Date(task.planned_end_date!);
      return endDate > latest ? endDate : latest;
    }, new Date(validTasks[0].planned_end_date!));

    return {
      start: addDays(earliestStart, -paddingDays),
      end: addDays(latestEnd, paddingDays),
    };
  }

  /**
   * Get recommended view mode based on project duration
   */
  public static getRecommendedViewMode(startDate: Date, endDate: Date): GanttViewMode {
    const days = differenceInDays(endDate, startDate);

    if (days <= 14) {
      return { mode: 'day', step: 1 };
    } else if (days <= 90) {
      return { mode: 'week', step: 1 };
    } else if (days <= 365) {
      return { mode: 'month', step: 1 };
    } else {
      return { mode: 'quarter', step: 1 };
    }
  }

  /**
   * Export Gantt data to different formats
   */
  public static exportGanttData(
    tasks: GanttTask[],
    format: 'json' | 'csv' | 'ical'
  ): string {
    switch (format) {
      case 'json':
        return JSON.stringify(tasks, null, 2);

      case 'csv':
        return this.convertToCSV(tasks);

      case 'ical':
        return this.convertToICal(tasks);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Convert Gantt tasks to CSV format
   */
  private static convertToCSV(tasks: GanttTask[]): string {
    const headers = [
      'ID', 'Name', 'Start Date', 'End Date', 'Duration', 'Progress',
      'Status', 'Priority', 'Dependencies', 'Assignee'
    ];

    const rows = tasks.map(task => this.convertTaskToCSVRow(task));

    // Flatten nested tasks
    const allRows: string[] = [headers.join(',')];
    rows.forEach(row => {
      allRows.push(row);
    });

    return allRows.join('\n');
  }

  /**
   * Convert a task to CSV row (including children)
   */
  private static convertTaskToCSVRow(task: GanttTask, level: number = 0): string[] {
    const duration = differenceInDays(task.end, task.start) + 1;
    const indent = '  '.repeat(level);
    const dependencies = task.dependencies.join(';');

    const row = [
      task.id,
      `"${indent}${task.name}"`,
      format(task.start, 'yyyy-MM-dd'),
      format(task.end, 'yyyy-MM-dd'),
      duration.toString(),
      task.progress.toString(),
      task.status,
      task.priority,
      dependencies,
      `"${task.assignee || ''}"`
    ];

    const rows = [row.join(',')];

    // Add children
    if (task.children) {
      task.children.forEach(child => {
        rows.push(...this.convertTaskToCSVRow(child, level + 1));
      });
    }

    return rows;
  }

  /**
   * Convert Gantt tasks to iCalendar format
   */
  private static convertToICal(tasks: GanttTask[]): string {
    const icalLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Renovation Job Costing//Gantt Chart//EN',
      'CALSCALE:GREGORIAN',
    ];

    const convertTaskToEvent = (task: GanttTask, prefix = '') => {
      const eventId = prefix + task.id.replace(/-/g, '');

      icalLines.push(
        'BEGIN:VEVENT',
        `UID:${eventId}@renovation-job-costing.com`,
        `DTSTART:${format(task.start, "yyyyMMdd'T'HHmmss'Z'")}`,
        `DTEND:${format(task.end, "yyyyMMdd'T'HHmmss'Z'")}`,
        `SUMMARY:${task.name}`,
        `DESCRIPTION:Status: ${task.status}, Progress: ${task.progress}%`,
        `PERCENT-COMPLETE:${task.progress}`,
        'END:VEVENT'
      );

      // Convert children
      if (task.children) {
        task.children.forEach(child => {
          convertTaskToEvent(child, `${prefix}-`);
        });
      }
    };

    tasks.forEach(task => convertTaskToEvent(task));
    icalLines.push('END:VCALENDAR');

    return icalLines.join('\r\n');
  }

  /**
   * Calculate Gantt statistics
   */
  public static calculateGanttStats(tasks: GanttTask[]): {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    criticalPathTasks: number;
    averageProgress: number;
    totalDuration: number;
    milestones: number;
    overdueTasks: number;
  } {
    const allTasks = this.flattenGanttTasks(tasks);
    const now = new Date();

    const stats = {
      totalTasks: allTasks.length,
      completedTasks: allTasks.filter(t => t.status === 'completed').length,
      inProgressTasks: allTasks.filter(t => t.status === 'in_progress').length,
      criticalPathTasks: allTasks.filter(t => t.priority === 'critical').length,
      averageProgress: 0,
      totalDuration: 0,
      milestones: allTasks.filter(t => t.type === 'milestone').length,
      overdueTasks: 0,
    };

    stats.averageProgress = allTasks.length > 0
      ? Math.round(allTasks.reduce((sum, t) => sum + t.progress, 0) / allTasks.length)
      : 0;

    const dateRange = this.calculateOptimalDateRange(
      allTasks.map(t => ({
        id: t.id,
        planned_start_date: t.start.toISOString(),
        planned_end_date: t.end.toISOString(),
      })) as any
    );

    stats.totalDuration = differenceInDays(dateRange.end, dateRange.start);

    stats.overdueTasks = allTasks.filter(t =>
      t.end < now && t.status !== 'completed'
    ).length;

    return stats;
  }

  /**
   * Flatten Gantt tasks (including children)
   */
  private static flattenGanttTasks(tasks: GanttTask[]): GanttTask[] {
    const result: GanttTask[] = [];

    tasks.forEach(task => {
      result.push(task);
      if (task.children) {
        result.push(...this.flattenGanttTasks(task.children));
      }
    });

    return result;
  }

  /**
   * Filter tasks for Gantt view
   */
  public static filterTasks(
    tasks: GanttTask[],
    filters: {
      status?: string[];
      priority?: string[];
      assignee?: string[];
      dateRange?: { start: Date; end: Date };
      searchText?: string;
    }
  ): GanttTask[] {
    return tasks.filter(task => {
      // Status filter
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(task.status)) return false;
      }

      // Priority filter
      if (filters.priority && filters.priority.length > 0) {
        if (!filters.priority.includes(task.priority)) return false;
      }

      // Assignee filter
      if (filters.assignee && filters.assignee.length > 0) {
        if (!task.assignee || !filters.assignee.some(a => task.assignee!.includes(a))) {
          return false;
        }
      }

      // Date range filter
      if (filters.dateRange) {
        const taskEnd = task.end;
        const taskStart = task.start;
        if (taskEnd < filters.dateRange.start || taskStart > filters.dateRange.end) {
          return false;
        }
      }

      // Search text filter
      if (filters.searchText) {
        const searchText = filters.searchText.toLowerCase();
        if (!task.name.toLowerCase().includes(searchText) &&
            !(task.assignee && task.assignee.toLowerCase().includes(searchText))) {
          return false;
        }
      }

      return true;
    });
  }
}