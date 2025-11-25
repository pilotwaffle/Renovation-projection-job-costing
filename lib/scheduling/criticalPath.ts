import { Task, TaskDependency, CriticalPathItem, UUID } from '@/types/scheduling';
import { addDays, differenceInDays, max } from 'date-fns';

/**
 * Critical Path Method (CPM) Implementation
 * Calculates the critical path, float/slack times, and project duration
 */
export class CriticalPathAnalyzer {
  /**
   * Calculate critical path for a set of tasks
   */
  public static calculateCriticalPath(
    tasks: Task[],
    dependencies: TaskDependency[]
  ): CriticalPathItem[] {
    // Initialize task data
    const taskData = this.initializeTaskData(tasks);

    // Forward pass - calculate early start and early finish
    this.forwardPass(taskData, dependencies);

    // Backward pass - calculate late start and late finish
    this.backwardPass(taskData, dependencies);

    // Calculate float/slack
    this.calculateFloat(taskData);

    // Identify critical path
    const criticalPath = this.identifyCriticalPath(taskData);

    return criticalPath;
  }

  /**
   * Initialize task data for CPM calculation
   */
  private static initializeTaskData(tasks: Task[]): Map<UUID, {
    task: Task;
    earlyStart: Date;
    earlyFinish: Date;
    lateStart: Date;
    lateFinish: Date;
    float: number;
    predecessors: UUID[];
    successors: UUID[];
  }> {
    const taskMap = new Map<UUID, any>();

    tasks.forEach(task => {
      const startDate = task.planned_start_date ? new Date(task.planned_start_date) : new Date();
      const endDate = task.planned_end_date ? new Date(task.planned_end_date) : addDays(startDate, task.duration_days || 1);

      taskMap.set(task.id, {
        task,
        earlyStart: startDate,
        earlyFinish: endDate,
        lateStart: startDate,
        lateFinish: endDate,
        float: 0,
        predecessors: [],
        successors: [],
      });
    });

    // Build predecessor and successor relationships
    dependencies.forEach(dep => {
      const predecessor = taskMap.get(dep.predecessor_id);
      const successor = taskMap.get(dep.successor_id);

      if (predecessor && successor) {
        predecessor.successors.push(dep.successor_id);
        successor.predecessors.push(dep.predecessor_id);
      }
    });

    return taskMap;
  }

  /**
   * Forward pass - calculate early start (ES) and early finish (EF)
   */
  private static forwardPass(
    taskData: Map<UUID, any>,
    dependencies: TaskDependency[]
  ): void {
    const processed = new Set<UUID>();
    const visited = new Set<UUID>();

    // Process tasks in topological order
    const rootTasks = Array.from(taskData.values()).filter(
      taskInfo => taskInfo.predecessors.length === 0
    );

    rootTasks.forEach(taskInfo => {
      this.forwardPassRecursive(taskInfo.task.id, taskData, dependencies, processed, visited);
    });
  }

  /**
   * Recursive forward pass processing
   */
  private static forwardPassRecursive(
    taskId: UUID,
    taskData: Map<UUID, any>,
    dependencies: TaskDependency[],
    processed: Set<UUID>,
    visited: Set<UUID>
  ): void {
    if (processed.has(taskId)) return;
    if (visited.has(taskId)) {
      throw new Error(`Circular dependency detected involving task ${taskId}`);
    }

    visited.add(taskId);
    const taskInfo = taskData.get(taskId);

    // Calculate early start based on predecessors
    if (taskInfo.predecessors.length > 0) {
      let maxEarlyFinish = new Date(0); // Earliest possible date

      taskInfo.predecessors.forEach(predId => {
        const predInfo = taskData.get(predId);
        if (!predInfo) return;

        // Process predecessor first
        this.forwardPassRecursive(predId, taskData, dependencies, processed, visited);

        // Find the dependency
        const dependency = dependencies.find(
          dep => dep.predecessor_id === predId && dep.successor_id === taskId
        );

        let predFinish = predInfo.earlyFinish;

        // Apply lag based on dependency type
        if (dependency) {
          switch (dependency.dependency_type) {
            case 'finish_to_start':
              predFinish = addDays(predInfo.earlyFinish, dependency.lag_days);
              break;
            case 'start_to_start':
              predFinish = addDays(predInfo.earlyStart, dependency.lag_days);
              break;
            case 'finish_to_finish':
              predFinish = addDays(predInfo.earlyFinish, dependency.lag_days);
              break;
            case 'start_to_finish':
              predFinish = addDays(predInfo.earlyStart, dependency.lag_days);
              break;
          }
        }

        if (predFinish > maxEarlyFinish) {
          maxEarlyFinish = predFinish;
        }
      });

      taskInfo.earlyStart = maxEarlyFinish;
    }

    // Calculate early finish
    const duration = taskInfo.task.duration_days || 1;
    taskInfo.earlyFinish = addDays(taskInfo.earlyStart, duration - 1); // -1 because start day counts as day 1

    processed.add(taskId);
    visited.delete(taskId);
  }

  /**
   * Backward pass - calculate late start (LS) and late finish (LF)
   */
  private static backwardPass(taskData: Map<UUID, any>, dependencies: TaskDependency[]): void {
    // Find project finish date
    const projectFinish = Array.from(taskData.values()).reduce(
      (latest, taskInfo) => taskInfo.earlyFinish > latest ? taskInfo.earlyFinish : latest,
      new Date(0)
    );

    const processed = new Set<UUID>();
    const visited = new Set<UUID>();

    // Process leaf tasks first (tasks with no successors)
    const leafTasks = Array.from(taskData.values()).filter(
      taskInfo => taskInfo.successors.length === 0
    );

    leafTasks.forEach(taskInfo => {
      taskInfo.lateFinish = projectFinish;
      this.backwardPassRecursive(taskInfo.task.id, taskData, dependencies, processed, visited);
    });
  }

  /**
   * Recursive backward pass processing
   */
  private static backwardPassRecursive(
    taskId: UUID,
    taskData: Map<UUID, any>,
    dependencies: TaskDependency[],
    processed: Set<UUID>,
    visited: Set<UUID>
  ): void {
    if (processed.has(taskId)) return;
    if (visited.has(taskId)) {
      throw new Error(`Circular dependency detected involving task ${taskId}`);
    }

    visited.add(taskId);
    const taskInfo = taskData.get(taskId);

    // Calculate late finish based on successors
    if (taskInfo.successors.length > 0) {
      let minLateStart = new Date('9999-12-31'); // Latest possible date

      taskInfo.successors.forEach(succId => {
        const succInfo = taskData.get(succId);
        if (!succInfo) return;

        // Process successor first
        this.backwardPassRecursive(succId, taskData, dependencies, processed, visited);

        // Find the dependency
        const dependency = dependencies.find(
          dep => dep.predecessor_id === taskId && dep.successor_id === succId
        );

        let succStart = succInfo.lateStart;

        // Apply lag based on dependency type (reverse calculation)
        if (dependency) {
          switch (dependency.dependency_type) {
            case 'finish_to_start':
              succStart = addDays(succInfo.lateStart, -dependency.lag_days);
              break;
            case 'start_to_start':
              succStart = addDays(succInfo.lateStart, -dependency.lag_days);
              break;
            case 'finish_to_finish':
              succStart = addDays(succInfo.lateFinish, -dependency.lag_days);
              break;
            case 'start_to_finish':
              succStart = addDays(succInfo.lateFinish, -dependency.lag_days);
              break;
          }
        }

        if (succStart < minLateStart) {
          minLateStart = succStart;
        }
      });

      taskInfo.lateFinish = minLateStart;
    }

    // Calculate late start
    const duration = taskInfo.task.duration_days || 1;
    taskInfo.lateStart = addDays(taskInfo.lateFinish, -(duration - 1));

    processed.add(taskId);
    visited.delete(taskId);
  }

  /**
   * Calculate float (slack) for each task
   */
  private static calculateFloat(taskData: Map<UUID, any>): void {
    taskData.forEach(taskInfo => {
      // Total float = Late Start - Early Start
      const floatDays = differenceInDays(taskInfo.lateStart, taskInfo.earlyStart);
      taskInfo.float = Math.max(0, floatDays);

      // Update the original task
      taskInfo.task.is_critical_path = taskInfo.float <= 0;
    });
  }

  /**
   * Identify critical path tasks
   */
  private static identifyCriticalPath(taskData: Map<UUID, any>): CriticalPathItem[] {
    const criticalTasks: CriticalPathItem[] = [];

    taskData.forEach(taskInfo => {
      const item: CriticalPathItem = {
        task_id: taskInfo.task.id,
        task_name: taskInfo.task.name,
        start_date: taskInfo.earlyStart.toISOString(),
        end_date: taskInfo.earlyFinish.toISOString(),
        duration: taskInfo.task.duration_days || 1,
        is_critical: taskInfo.float <= 0,
        slack_days: taskInfo.float,
      };

      criticalTasks.push(item);
    });

    // Sort by start date for logical path display
    return criticalTasks.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  }

  /**
   * Get project duration
   */
  public static getProjectDuration(tasks: Task[]): number {
    if (tasks.length === 0) return 0;

    const earliestStart = tasks.reduce((earliest, task) => {
      const startDate = task.planned_start_date ? new Date(task.planned_start_date) : new Date();
      return startDate < earliest ? startDate : earliest;
    }, new Date('9999-12-31'));

    const latestFinish = tasks.reduce((latest, task) => {
      const endDate = task.planned_end_date ? new Date(task.planned_end_date) : new Date();
      return endDate > latest ? endDate : latest;
    }, new Date(0));

    return differenceInDays(latestFinish, earliestStart) + 1; // +1 to include both start and end days
  }

  /**
   * Get critical path length (duration)
   */
  public static getCriticalPathLength(criticalPath: CriticalPathItem[]): number {
    if (criticalPath.length === 0) return 0;

    // Sum durations of critical tasks, accounting for overlaps
    let totalDuration = 0;
    let currentEnd: Date | null = null;

    // Sort critical path by start date
    const sortedPath = [...criticalPath].sort(
      (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );

    sortedPath.forEach(item => {
      const itemStart = new Date(item.start_date);
      const itemEnd = new Date(item.end_date);

      if (!currentEnd) {
        totalDuration = item.duration;
        currentEnd = itemEnd;
      } else {
        if (itemStart <= currentEnd) {
          // Overlapping or sequential - add only the additional duration
          const overlap = differenceInDays(currentEnd, itemStart);
          if (overlap < 0) overlap = 0; // Shouldn't happen in proper critical path
          totalDuration += item.duration - overlap;
          currentEnd = itemEnd > currentEnd ? itemEnd : currentEnd;
        } else {
          // Gap in critical path - add full duration plus gap
          totalDuration += differenceInDays(itemStart, currentEnd) + item.duration;
          currentEnd = itemEnd;
        }
      }
    });

    return totalDuration;
  }

  /**
   * Analyze impact of task delays on critical path
   */
  public static analyzeDelayImpact(
    taskId: UUID,
    delayDays: number,
    tasks: Task[],
    dependencies: TaskDependency[]
  ): {
    affectedTasks: UUID[];
    newProjectDuration: number;
    criticalPathChanges: {
      added: CriticalPathItem[];
      removed: CriticalPathItem[];
    };
  } {
    // Create a copy of tasks with the delay applied
    const delayedTasks = tasks.map(task => {
      if (task.id === taskId) {
        const newEndDate = task.planned_end_date ?
          addDays(new Date(task.planned_end_date), delayDays) :
          addDays(new Date(task.planned_start_date!), delayDays);

        return {
          ...task,
          planned_end_date: newEndDate.toISOString(),
          duration_days: (task.duration_days || 0) + delayDays,
        };
      }
      return task;
    });

    // Calculate new critical path
    const newCriticalPath = this.calculateCriticalPath(delayedTasks, dependencies);
    const originalCriticalPath = this.calculateCriticalPath(tasks, dependencies);

    // Find affected tasks (those whose successors are impacted)
    const affectedTasks = new Set<UUID>();
    affectedTasks.add(taskId);

    // Find all tasks that depend on this task (transitively)
    const findSuccessors = (currentTaskId: UUID) => {
      const directSuccessors = dependencies
        .filter(dep => dep.predecessor_id === currentTaskId)
        .map(dep => dep.successor_id);

      directSuccessors.forEach(succId => {
        if (!affectedTasks.has(succId)) {
          affectedTasks.add(succId);
          findSuccessors(succId);
        }
      });
    };

    findSuccessors(taskId);

    const newProjectDuration = this.getProjectDuration(delayedTasks);

    // Compare critical paths
    const newCriticalIds = new Set(newCriticalPath.map(item => item.task_id));
    const originalCriticalIds = new Set(originalCriticalPath.map(item => item.task_id));

    const criticalPathChanges = {
      added: newCriticalPath.filter(item => !originalCriticalIds.has(item.task_id)),
      removed: originalCriticalPath.filter(item => !newCriticalIds.has(item.task_id)),
    };

    return {
      affectedTasks: Array.from(affectedTasks),
      newProjectDuration,
      criticalPathChanges,
    };
  }

  /**
   * Get tasks that can be delayed without affecting project completion
   */
  public static getSlackTasks(
    tasks: Task[],
    dependencies: TaskDependency[]
  ): Array<{
    task: Task;
    totalFloat: number;
    freeFloat: number;
    canDelay: number;
  }> {
    const criticalPath = this.calculateCriticalPath(tasks, dependencies);
    const criticalIds = new Set(criticalPath.filter(item => item.is_critical).map(item => item.task_id));

    return tasks
      .filter(task => !criticalIds.has(task.id))
      .map(task => {
        const criticalItem = criticalPath.find(item => item.task_id === task.id);
        const totalFloat = criticalItem?.slack_days || 0;

        // Calculate free float (delay that won't affect successors)
        const freeFloat = this.calculateFreeFloat(task, tasks, dependencies);

        return {
          task,
          totalFloat,
          freeFloat,
          canDelay: Math.min(totalFloat, freeFloat),
        };
      })
      .sort((a, b) => b.canDelay - a.canDelay);
  }

  /**
   * Calculate free float for a task
   */
  private static calculateFreeFloat(
    task: Task,
    tasks: Task[],
    dependencies: TaskDependency[]
  ): number {
    const taskEndDate = task.planned_end_date ? new Date(task.planned_end_date) : new Date();

    // Find all successors
    const successors = dependencies
      .filter(dep => dep.predecessor_id === task.id)
      .map(dep => dep.successor_id);

    if (successors.length === 0) {
      return Infinity; // Leaf tasks have infinite free float (though practically limited by project end)
    }

    // Find earliest successor start
    let earliestSuccessorStart = new Date('9999-12-31');

    successors.forEach(succId => {
      const successor = tasks.find(t => t.id === succId);
      if (successor && successor.planned_start_date) {
        const succStartDate = new Date(successor.planned_start_date);
        if (succStartDate < earliestSuccessorStart) {
          earliestSuccessorStart = succStartDate;
        }
      }
    });

    return differenceInDays(earliestSuccessorStart, taskEndDate) - 1;
  }

  /**
   * Validate critical path calculation
   */
  public static validateCriticalPath(
    tasks: Task[],
    dependencies: TaskDependency[]
  ): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for circular dependencies
    try {
      this.calculateCriticalPath(tasks, dependencies);
    } catch (error) {
      errors.push(`Critical path calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isValid: false, errors, warnings };
    }

    // Check for tasks without dates
    const tasksWithoutDates = tasks.filter(task => !task.planned_start_date || !task.planned_end_date);
    if (tasksWithoutDates.length > 0) {
      warnings.push(`${tasksWithoutDates.length} tasks are missing start or end dates`);
    }

    // Check for dependencies with non-existent tasks
    const taskIds = new Set(tasks.map(task => task.id));
    dependencies.forEach(dep => {
      if (!taskIds.has(dep.predecessor_id)) {
        errors.push(`Dependency references non-existent predecessor task: ${dep.predecessor_id}`);
      }
      if (!taskIds.has(dep.successor_id)) {
        errors.push(`Dependency references non-existent successor task: ${dep.successor_id}`);
      }
    });

    // Check for negative duration tasks
    const negativeDurationTasks = tasks.filter(task => task.duration_days && task.duration_days < 0);
    if (negativeDurationTasks.length > 0) {
      errors.push(`${negativeDurationTasks.length} tasks have negative duration`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}