import { Task, TaskDependency, CreateTaskRequest, UpdateTaskRequest, UUID } from '@/types/scheduling';
import { addDays, differenceInDays, isAfter, isBefore, parseISO } from 'date-fns';

/**
 * Task Manager
 * Handles task CRUD operations, dependency management, and task calculations
 */
export class TaskManager {
  /**
   * Create a new task
   */
  public static createTask(request: CreateTaskRequest): Task {
    const now = new Date().toISOString();

    // Calculate end date based on duration
    const startDate = request.planned_start_date || now;
    const durationDays = request.duration_days || 1;
    const endDate = addDays(new Date(startDate), durationDays).toISOString();

    return {
      id: crypto.randomUUID() as UUID,
      schedule_id: request.schedule_id,
      scope_item_id: request.scope_item_id,
      name: request.name,
      description: request.description,
      type: request.type || 'task',
      status: 'not_started',
      priority: request.priority || 'normal',

      // Scheduling data
      planned_start_date: startDate,
      planned_end_date: endDate,
      actual_start_date: undefined,
      actual_end_date: undefined,
      duration_days: durationDays,
      progress_percentage: 0,

      // Hierarchy
      parent_task_id: request.parent_task_id,
      sort_order: request.sort_order || 0,
      is_critical_path: false,

      // Cost tracking
      estimated_cost: request.estimated_cost || 0,
      actual_cost: 0,

      created_at: now,
      updated_at: now,
    };
  }

  /**
   * Update an existing task
   */
  public static updateTask(task: Task, request: UpdateTaskRequest): Task {
    const now = new Date().toISOString();
    const updatedTask = { ...task, updated_at: now };

    // Update basic fields
    if (request.name !== undefined) updatedTask.name = request.name;
    if (request.description !== undefined) updatedTask.description = request.description;
    if (request.type !== undefined) updatedTask.type = request.type;
    if (request.status !== undefined) updatedTask.status = request.status;
    if (request.priority !== undefined) updatedTask.priority = request.priority;
    if (request.progress_percentage !== undefined) updatedTask.progress_percentage = request.progress_percentage;
    if (request.parent_task_id !== undefined) updatedTask.parent_task_id = request.parent_task_id;
    if (request.sort_order !== undefined) updatedTask.sort_order = request.sort_order;
    if (request.estimated_cost !== undefined) updatedTask.estimated_cost = request.estimated_cost;
    if (request.actual_cost !== undefined) updatedTask.actual_cost = request.actual_cost;

    // Handle date changes
    const startDateChanged = request.planned_start_date && request.planned_start_date !== task.planned_start_date;
    const endDateChanged = request.planned_end_date && request.planned_end_date !== task.planned_end_date;
    const durationChanged = request.duration_days !== undefined && request.duration_days !== task.duration_days;

    if (startDateChanged || endDateChanged || durationChanged) {
      // If duration changed, recalculate end date
      if (durationChanged) {
        updatedTask.duration_days = request.duration_days!;
        const startDate = request.planned_start_date || task.planned_start_date || now;
        updatedTask.planned_end_date = addDays(new Date(startDate), request.duration_days!).toISOString();
      }

      // If start date changed but duration didn't, adjust end date
      if (startDateChanged && !durationChanged) {
        updatedTask.planned_start_date = request.planned_start_date!;
        if (task.duration_days && task.planned_start_date) {
          const daysDiff = differenceInDays(
            new Date(request.planned_start_date!),
            new Date(task.planned_start_date)
          );
          if (task.planned_end_date) {
            updatedTask.planned_end_date = addDays(new Date(task.planned_end_date), daysDiff).toISOString();
          }
        }
      }

      // If end date explicitly set, use it
      if (endDateChanged) {
        updatedTask.planned_end_date = request.planned_end_date!;
        // Recalculate duration if start date is also available
        if (updatedTask.planned_start_date) {
          updatedTask.duration_days = Math.max(1, differenceInDays(
            new Date(request.planned_end_date!),
            new Date(updatedTask.planned_start_date)
          ));
        }
      }
    }

    // Handle actual dates for status changes
    if (request.status === 'in_progress' && task.status !== 'in_progress') {
      updatedTask.actual_start_date = updatedTask.actual_start_date || now;
    }

    if (request.status === 'completed' && task.status !== 'completed') {
      updatedTask.actual_end_date = updatedTask.actual_end_date || now;
      updatedTask.progress_percentage = 100;
      if (!updatedTask.actual_start_date) {
        updatedTask.actual_start_date = now;
      }
    }

    return updatedTask;
  }

  /**
   * Delete a task and clean up dependencies
   */
  public static deleteTask(
    taskId: UUID,
    tasks: Task[],
    dependencies: TaskDependency[]
  ): { remainingTasks: Task[]; remainingDependencies: TaskDependency[] } {
    // Remove the task
    const remainingTasks = tasks.filter(t => t.id !== taskId);

    // Remove child tasks
    const childTaskIds = tasks
      .filter(t => t.parent_task_id === taskId)
      .map(t => t.id);

    const finalTasks = remainingTasks.filter(t => !childTaskIds.includes(t.id));

    // Remove related dependencies
    const remainingDependencies = dependencies.filter(
      dep => dep.predecessor_id !== taskId && dep.successor_id !== taskId
    );

    return { remainingTasks: finalTasks, remainingDependencies: remainingDependencies };
  }

  /**
   * Add a dependency between tasks
   */
  public static addDependency(
    predecessorId: UUID,
    successorId: UUID,
    dependencies: TaskDependency[],
    type: TaskDependency['dependency_type'] = 'finish_to_start',
    lagDays: number = 0
  ): TaskDependency[] {
    // Check if dependency already exists
    const exists = dependencies.some(
      dep => dep.predecessor_id === predecessorId && dep.successor_id === successorId
    );

    if (exists) {
      throw new Error('Dependency already exists between these tasks');
    }

    // Check for circular dependencies
    if (this.wouldCreateCircularDependency(predecessorId, successorId, dependencies)) {
      throw new Error('This dependency would create a circular reference');
    }

    const newDependency: TaskDependency = {
      id: crypto.randomUUID() as UUID,
      predecessor_id: predecessorId,
      successor_id: successorId,
      dependency_type: type,
      lag_days: lagDays,
      created_at: new Date().toISOString(),
    };

    return [...dependencies, newDependency];
  }

  /**
   * Remove a dependency
   */
  public static removeDependency(
    predecessorId: UUID,
    successorId: UUID,
    dependencies: TaskDependency[]
  ): TaskDependency[] {
    return dependencies.filter(
      dep => !(dep.predecessor_id === predecessorId && dep.successor_id === successorId)
    );
  }

  /**
   * Check if adding a dependency would create a circular reference
   */
  private static wouldCreateCircularDependency(
    predecessorId: UUID,
    successorId: UUID,
    dependencies: TaskDependency[]
  ): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (taskId: string): boolean => {
      if (recursionStack.has(taskId)) {
        return true;
      }

      if (visited.has(taskId)) {
        return false;
      }

      visited.add(taskId);
      recursionStack.add(taskId);

      // Check all successors
      const successors = dependencies
        .filter(dep => dep.predecessor_id === taskId)
        .map(dep => dep.successor_id);

      for (const successor of successors) {
        if (hasCycle(successor)) {
          return true;
        }
      }

      recursionStack.delete(taskId);
      return false;
    };

    // Add the new dependency temporarily and check for cycles
    const tempDependencies = [...dependencies, {
      predecessor_id: predecessorId,
      successor_id: successorId,
    } as TaskDependency];

    return hasCycle(predecessorId);
  }

  /**
   * Get all predecessors of a task
   */
  public static getPredecessors(taskId: UUID, dependencies: TaskDependency[]): TaskDependency[] {
    return dependencies.filter(dep => dep.successor_id === taskId);
  }

  /**
   * Get all successors of a task
   */
  public static getSuccessors(taskId: UUID, dependencies: TaskDependency[]): TaskDependency[] {
    return dependencies.filter(dep => dep.predecessor_id === taskId);
  }

  /**
   * Get task hierarchy with parent-child relationships
   */
  public static buildTaskHierarchy(tasks: Task[]): Map<string, Task[]> {
    const hierarchy = new Map<string, Task[]>();

    // Initialize with root tasks
    const rootTasks = tasks.filter(task => !task.parent_task_id);
    hierarchy.set('root', rootTasks.sort((a, b) => a.sort_order - b.sort_order));

    // Group tasks by parent
    tasks.forEach(task => {
      if (task.parent_task_id) {
        if (!hierarchy.has(task.parent_task_id)) {
          hierarchy.set(task.parent_task_id, []);
        }
        hierarchy.get(task.parent_task_id)!.push(task);
      }
    });

    // Sort children by order
    hierarchy.forEach(children => {
      children.sort((a, b) => a.sort_order - b.sort_order);
    });

    return hierarchy;
  }

  /**
   * Get flat task list with hierarchy information
   */
  public static flattenTaskHierarchy(hierarchy: Map<string, Task[]>, parentTask?: Task): Task[] {
    const result: Task[] = [];
    const parentId = parentTask?.id || 'root';
    const children = hierarchy.get(parentId) || [];

    children.forEach(child => {
      result.push(child);
      // Add grandchildren recursively
      const grandchildren = this.flattenTaskHierarchy(hierarchy, child);
      result.push(...grandchildren);
    });

    return result;
  }

  /**
   * Calculate task statistics
   */
  public static calculateTaskStats(tasks: Task[]): {
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    delayed: number;
    blocked: number;
    progressPercentage: number;
  } {
    const stats = {
      total: tasks.length,
      completed: 0,
      inProgress: 0,
      notStarted: 0,
      delayed: 0,
      blocked: 0,
      progressPercentage: 0,
    };

    tasks.forEach(task => {
      switch (task.status) {
        case 'completed':
          stats.completed++;
          break;
        case 'in_progress':
          stats.inProgress++;
          break;
        case 'not_started':
          stats.notStarted++;
          break;
        case 'delayed':
          stats.delayed++;
          break;
        case 'blocked':
          stats.blocked++;
          break;
      }
    });

    stats.progressPercentage = tasks.length > 0
      ? Math.round(tasks.reduce((sum, task) => sum + task.progress_percentage, 0) / tasks.length)
      : 0;

    return stats;
  }

  /**
   * Check for tasks that are overdue
   */
  public static getOverdueTasks(tasks: Task[]): Task[] {
    const now = new Date();

    return tasks.filter(task => {
      if (task.status === 'completed' || task.status === 'archived') {
        return false;
      }

      if (!task.planned_end_date) {
        return false;
      }

      return isAfter(now, new Date(task.planned_end_date));
    });
  }

  /**
   * Check for tasks starting soon
   */
  public static getUpcomingTasks(tasks: Task[], daysAhead: number = 7): Task[] {
    const now = new Date();
    const futureDate = addDays(now, daysAhead);

    return tasks.filter(task => {
      if (task.status !== 'not_started') {
        return false;
      }

      if (!task.planned_start_date) {
        return false;
      }

      const startDate = new Date(task.planned_start_date);
      return isAfter(startDate, now) && isBefore(startDate, futureDate);
    });
  }

  /**
   * Update parent task progress based on children
   */
  public static updateParentTaskProgress(tasks: Task[]): Task[] {
    const taskMap = new Map<string, Task>();
    tasks.forEach(task => taskMap.set(task.id, task));

    const updatedTasks = [...tasks];

    // Update progress for all parent tasks
    tasks.forEach(task => {
      if (task.parent_task_id && taskMap.has(task.parent_task_id)) {
        const parent = taskMap.get(task.parent_task_id)!;
        const children = tasks.filter(t => t.parent_task_id === parent.id);

        if (children.length > 0) {
          const averageProgress = Math.round(
            children.reduce((sum, child) => sum + child.progress_percentage, 0) / children.length
          );

          const parentIndex = updatedTasks.findIndex(t => t.id === parent.id);
          if (parentIndex !== -1) {
            updatedTasks[parentIndex] = {
              ...updatedTasks[parentIndex],
              progress_percentage: averageProgress,
              updated_at: new Date().toISOString(),
            };
          }
        }
      }
    });

    return updatedTasks;
  }

  /**
   * Validate task dates
   */
  public static validateTaskDates(task: Task): string[] {
    const errors: string[] = [];

    if (task.planned_start_date && task.planned_end_date) {
      const start = new Date(task.planned_start_date);
      const end = new Date(task.planned_end_date);

      if (isAfter(start, end)) {
        errors.push('Start date must be before end date');
      }

      if (task.duration_days && task.duration_days <= 0) {
        errors.push('Duration must be greater than 0');
      }
    }

    if (task.actual_start_date && task.actual_end_date) {
      const actualStart = new Date(task.actual_start_date);
      const actualEnd = new Date(task.actual_end_date);

      if (isAfter(actualStart, actualEnd)) {
        errors.push('Actual start date must be before actual end date');
      }
    }

    return errors;
  }

  /**
   * Calculate task duration in working days
   */
  public static calculateWorkingDays(startDate: Date, endDate: Date): number {
    let workingDays = 0;
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Saturday or Sunday
        workingDays++;
      }
      currentDate = addDays(currentDate, 1);
    }

    return workingDays;
  }
}