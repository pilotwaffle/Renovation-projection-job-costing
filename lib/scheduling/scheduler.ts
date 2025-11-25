import { Task, TaskDependency, Resource, TaskAssignment, SchedulingOptions, SchedulingResult, ResourceConflict } from '@/types/scheduling';
import { addDays, isWeekend, differenceInDays, isSameDay, parseISO } from 'date-fns';

/**
 * Core Scheduling Engine
 * Handles task scheduling with dependencies, resource allocation, and critical path analysis
 */
export class SchedulingEngine {
  private options: SchedulingOptions;

  constructor(options: Partial<SchedulingOptions> = {}) {
    this.options = {
      workingDays: [1, 2, 3, 4, 5], // Monday to Friday
      workingHours: { start: 8, end: 17 }, // 8 AM to 5 PM
      holidays: [],
      weekendsExcluded: true,
      autoLevelResources: true,
      considerDependencies: true,
      ...options,
    };
  }

  /**
   * Schedule tasks with dependencies and resource constraints
   */
  public scheduleTasks(
    tasks: Task[],
    dependencies: TaskDependency[],
    resources: Resource[],
    assignments: TaskAssignment[]
  ): SchedulingResult {
    try {
      // Reset task dates if needed
      const tasksToSchedule = this.resetTaskDates(tasks);

      // Calculate task hierarchy
      const taskHierarchy = this.buildTaskHierarchy(tasksToSchedule);

      // Calculate early start/finish times (forward pass)
      this.forwardPass(taskHierarchy, dependencies);

      // Calculate late start/finish times (backward pass)
      this.backwardPass(taskHierarchy, dependencies);

      // Calculate slack and critical path
      this.calculateSlack(taskHierarchy, dependencies);

      // Check for resource conflicts
      const conflicts = this.checkResourceConflicts(tasksToSchedule, resources, assignments);

      // Auto-level resources if enabled
      if (this.options.autoLevelResources && conflicts.length > 0) {
        this.levelResources(tasksToSchedule, resources, assignments);
        // Recalculate critical path after resource leveling
        this.forwardPass(taskHierarchy, dependencies);
        this.backwardPass(taskHierarchy, dependencies);
        this.calculateSlack(taskHierarchy, dependencies);
      }

      const criticalPath = this.getCriticalPath(tasksToSchedule);
      const summary = this.calculateSummary(tasksToSchedule, assignments);

      return {
        success: true,
        tasks: tasksToSchedule,
        conflicts: this.checkResourceConflicts(tasksToSchedule, resources, assignments),
        warnings: [],
        criticalPath,
        summary,
      };
    } catch (error) {
      return {
        success: false,
        tasks,
        conflicts: [],
        warnings: [`Scheduling failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        criticalPath: [],
        summary: {
          totalDuration: 0,
          estimatedCost: 0,
          resourceUtilization: {},
        },
      };
    }
  }

  /**
   * Reset task dates to initial state for rescheduling
   */
  private resetTaskDates(tasks: Task[]): Task[] {
    return tasks.map(task => ({
      ...task,
      planned_start_date: task.planned_start_date || new Date().toISOString(),
      planned_end_date: task.planned_end_date || addDays(new Date(task.planned_start_date), task.duration_days || 1).toISOString(),
    }));
  }

  /**
   * Build task hierarchy (parent-child relationships)
   */
  private buildTaskHierarchy(tasks: Task[]): Map<string, Task[]> {
    const hierarchy = new Map<string, Task[]>();

    // Group tasks by parent
    tasks.forEach(task => {
      const parentId = task.parent_task_id || 'root';
      if (!hierarchy.has(parentId)) {
        hierarchy.set(parentId, []);
      }
      hierarchy.get(parentId)!.push(task);
    });

    // Sort tasks by order within each parent
    hierarchy.forEach(children => {
      children.sort((a, b) => a.sort_order - b.sort_order);
    });

    return hierarchy;
  }

  /**
   * Forward pass - calculate early start and finish times
   */
  private forwardPass(taskHierarchy: Map<string, Task[]>, dependencies: TaskDependency[]): void {
    const processed = new Set<string>();

    // Process root tasks first
    const rootTasks = taskHierarchy.get('root') || [];
    rootTasks.forEach(task => {
      this.processTaskForward(task, taskHierarchy, dependencies, processed);
    });
  }

  /**
   * Process a single task in forward pass
   */
  private processTaskForward(
    task: Task,
    taskHierarchy: Map<string, Task[]>,
    dependencies: TaskDependency[],
    processed: Set<string>
  ): void {
    if (processed.has(task.id)) return;

    // Calculate early start based on dependencies
    let earlyStart = new Date(task.planned_start_date);

    if (this.options.considerDependencies) {
      const predecessorDeps = dependencies.filter(dep => dep.successor_id === task.id);

      predecessorDeps.forEach(dep => {
        const predecessor = this.findTask(dep.predecessor_id, taskHierarchy);
        if (predecessor) {
          this.processTaskForward(predecessor, taskHierarchy, dependencies, processed);

          let depDate = new Date(predecessor.planned_end_date!);

          // Apply dependency type and lag
          switch (dep.dependency_type) {
            case 'finish_to_start':
              depDate = addDays(depDate, dep.lag_days);
              break;
            case 'start_to_start':
              depDate = addDays(new Date(predecessor.planned_start_date!), dep.lag_days);
              break;
            case 'finish_to_finish':
              depDate = addDays(new Date(predecessor.planned_end_date!), dep.lag_days);
              break;
            case 'start_to_finish':
              depDate = addDays(new Date(predecessor.planned_start_date!), dep.lag_days);
              break;
          }

          if (depDate > earlyStart) {
            earlyStart = depDate;
          }
        }
      });
    }

    // Account for parent task dates
    if (task.parent_task_id) {
      const parent = this.findTask(task.parent_task_id, taskHierarchy);
      if (parent && parent.planned_start_date && new Date(parent.planned_start_date) > earlyStart) {
        earlyStart = new Date(parent.planned_start_date);
      }
    }

    // Calculate duration considering working days
    const workingDays = this.calculateWorkingDays(earlyStart, task.duration_days || 1);
    task.planned_start_date = earlyStart.toISOString();
    task.planned_end_date = workingDays.toISOString();

    // Mark as processed
    processed.add(task.id);

    // Process children
    const children = taskHierarchy.get(task.id) || [];
    children.forEach(child => {
      this.processTaskForward(child, taskHierarchy, dependencies, processed);
    });
  }

  /**
   * Backward pass - calculate late start and finish times
   */
  private backwardPass(taskHierarchy: Map<string, Task[]>, dependencies: TaskDependency[]): void {
    // Find project end date (latest task end)
    const allTasks = Array.from(taskHierarchy.values()).flat();
    const endDate = new Date(Math.max(...allTasks.map(task =>
      new Date(task.planned_end_date!).getTime()
    )));

    const processed = new Set<string>();

    // Process leaf tasks first (tasks with no successors)
    allTasks.forEach(task => {
      const hasSuccessors = dependencies.some(dep => dep.predecessor_id === task.id);
      if (!hasSuccessors) {
        this.processTaskBackward(task, taskHierarchy, dependencies, processed, endDate);
      }
    });
  }

  /**
   * Process a single task in backward pass
   */
  private processTaskBackward(
    task: Task,
    taskHierarchy: Map<string, Task[]>,
    dependencies: TaskDependency[],
    processed: Set<string>,
    projectEnd: Date
  ): void {
    if (processed.has(task.id)) return;

    // Calculate late finish based on successors
    let lateFinish = projectEnd;

    const successorDeps = dependencies.filter(dep => dep.predecessor_id === task.id);

    if (successorDeps.length > 0) {
      successorDeps.forEach(dep => {
        const successor = this.findTask(dep.successor_id, taskHierarchy);
        if (successor) {
          this.processTaskBackward(successor, taskHierarchy, dependencies, processed, projectEnd);

          let depDate = new Date(successor.planned_end_date!);

          // Apply dependency type and lag (reverse calculation)
          switch (dep.dependency_type) {
            case 'finish_to_start':
              depDate = addDays(new Date(successor.planned_start_date!), -dep.lag_days);
              break;
            case 'start_to_start':
              depDate = addDays(new Date(successor.planned_start_date!), -dep.lag_days);
              break;
            case 'finish_to_finish':
              depDate = addDays(new Date(successor.planned_end_date!), -dep.lag_days);
              break;
            case 'start_to_finish':
              depDate = addDays(new Date(successor.planned_start_date!), -dep.lag_days);
              break;
          }

          if (depDate < lateFinish) {
            lateFinish = depDate;
          }
        }
      });
    }

    // Store late dates as computed properties
    (task as any).late_finish = lateFinish;
    (task as any).late_start = addDays(lateFinish, -(task.duration_days || 1));

    processed.add(task.id);
  }

  /**
   * Calculate slack and identify critical path
   */
  private calculateSlack(taskHierarchy: Map<string, Task[]>, dependencies: TaskDependency[]): void {
    const allTasks = Array.from(taskHierarchy.values()).flat();

    allTasks.forEach(task => {
      const earlyStart = new Date(task.planned_start_date!);
      const lateStart = (task as any).late_start || earlyStart;

      // Calculate slack (float)
      const slackDays = differenceInDays(lateStart, earlyStart);
      (task as any).slack_days = Math.max(0, slackDays);

      // Mark as critical if slack is 0 or less
      task.is_critical_path = slackDays <= 0;
    });
  }

  /**
   * Get critical path tasks
   */
  public getCriticalPath(tasks: Task[]): Task[] {
    return tasks.filter(task => task.is_critical_path);
  }

  /**
   * Check for resource conflicts
   */
  private checkResourceConflicts(
    tasks: Task[],
    resources: Resource[],
    assignments: TaskAssignment[]
  ): ResourceConflict[] {
    const conflicts: ResourceConflict[] = [];

    // Group assignments by resource
    const resourceAssignments = new Map<string, TaskAssignment[]>();
    assignments.forEach(assignment => {
      if (!resourceAssignments.has(assignment.resource_id)) {
        resourceAssignments.set(assignment.resource_id, []);
      }
      resourceAssignments.get(assignment.resource_id)!.push(assignment);
    });

    // Check each resource for conflicts
    resourceAssignments.forEach((resourceAssigns, resourceId) => {
      const resource = resources.find(r => r.id === resourceId);
      if (!resource || !resource.is_active) return;

      // Check for overlapping assignments
      for (let i = 0; i < resourceAssigns.length; i++) {
        for (let j = i + 1; j < resourceAssigns.length; j++) {
          const assign1 = resourceAssigns[i];
          const assign2 = resourceAssigns[j];

          const task1 = tasks.find(t => t.id === assign1.task_id);
          const task2 = tasks.find(t => t.id === assign2.task_id);

          if (!task1 || !task2) continue;
          if (task1.status === 'completed' || task2.status === 'completed') continue;

          // Check for date overlap
          if (this.doTasksOverlap(task1, task2)) {
            // Check if allocation exceeds capacity
            const totalAllocation = assign1.allocation_percentage + assign2.allocation_percentage;
            if (totalAllocation > 100) {
              conflicts.push({
                task_id: task2.id,
                task_name: task2.name,
                conflict_start: task1.planned_start_date!,
                conflict_end: task1.planned_end_date!,
                conflict_percentage: totalAllocation,
              });
            }
          }
        }
      }
    });

    return conflicts;
  }

  /**
   * Check if two tasks overlap in time
   */
  private doTasksOverlap(task1: Task, task2: Task): boolean {
    const start1 = new Date(task1.planned_start_date!);
    const end1 = new Date(task1.planned_end_date!);
    const start2 = new Date(task2.planned_start_date!);
    const end2 = new Date(task2.planned_end_date!);

    return start1 < end2 && start2 < end1;
  }

  /**
   * Level resources to resolve conflicts
   */
  private levelResources(
    tasks: Task[],
    resources: Resource[],
    assignments: TaskAssignment[]
  ): void {
    // Simple resource leveling - delay conflicting tasks
    // In a real implementation, you'd use more sophisticated algorithms
    const conflicts = this.checkResourceConflicts(tasks, resources, assignments);

    conflicts.forEach(conflict => {
      const conflictingTask = tasks.find(t => t.id === conflict.task_id);
      if (conflictingTask) {
        // Delay task by 1 day to resolve conflict
        const newStartDate = addDays(new Date(conflictingTask.planned_start_date!), 1);
        const newEndDate = addDays(new Date(conflictingTask.planned_end_date!), 1);

        conflictingTask.planned_start_date = newStartDate.toISOString();
        conflictingTask.planned_end_date = newEndDate.toISOString();
      }
    });
  }

  /**
   * Calculate working days between dates
   */
  private calculateWorkingDays(startDate: Date, durationDays: number): Date {
    let currentDate = new Date(startDate);
    let daysAdded = 0;

    while (daysAdded < durationDays) {
      if (!this.isNonWorkingDay(currentDate)) {
        daysAdded++;
      }
      if (daysAdded < durationDays) {
        currentDate = addDays(currentDate, 1);
      }
    }

    return currentDate;
  }

  /**
   * Check if a date is a non-working day
   */
  private isNonWorkingDay(date: Date): boolean {
    const dayOfWeek = date.getDay();

    // Check weekends
    if (this.options.weekendsExcluded && (dayOfWeek === 0 || dayOfWeek === 6)) {
      return true;
    }

    // Check holidays
    const dateString = date.toISOString().split('T')[0];
    return this.options.holidays.includes(dateString);
  }

  /**
   * Find a task in the hierarchy
   */
  private findTask(taskId: string, taskHierarchy: Map<string, Task[]>): Task | undefined {
    const allTasks = Array.from(taskHierarchy.values()).flat();
    return allTasks.find(task => task.id === taskId);
  }

  /**
   * Calculate project summary
   */
  private calculateSummary(tasks: Task[], assignments: TaskAssignment[]) {
    const totalDuration = Math.max(...tasks.map(task =>
      differenceInDays(new Date(task.planned_end_date!), new Date(task.planned_start_date!))
    ));

    const estimatedCost = tasks.reduce((sum, task) => sum + task.estimated_cost, 0);

    // Calculate resource utilization
    const resourceUtilization: Record<string, number> = {};
    assignments.forEach(assignment => {
      resourceUtilization[assignment.resource_id] =
        (resourceUtilization[assignment.resource_id] || 0) + assignment.allocation_percentage;
    });

    return {
      totalDuration,
      estimatedCost,
      resourceUtilization,
    };
  }

  /**
   * Update scheduling options
   */
  public updateOptions(options: Partial<SchedulingOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current scheduling options
   */
  public getOptions(): SchedulingOptions {
    return { ...this.options };
  }
}

// Singleton instance
export const schedulingEngine = new SchedulingEngine();