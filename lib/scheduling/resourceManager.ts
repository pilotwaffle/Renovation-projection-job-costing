import {
  Resource,
  TaskAssignment,
  Task,
  CreateResourceRequest,
  CreateAssignmentRequest,
  UpdateAssignmentRequest,
  ResourceConflict,
  ResourceHeatmapData,
  UUID
} from '@/types/scheduling';
import { addDays, differenceInDays, isWithinInterval, parseISO } from 'date-fns';

/**
 * Resource Manager
 * Handles resource allocation, utilization tracking, and conflict resolution
 */
export class ResourceManager {
  /**
   * Create a new resource
   */
  public static createResource(request: CreateResourceRequest): Resource {
    const now = new Date().toISOString();

    return {
      id: crypto.randomUUID() as UUID,
      job_id: request.job_id,
      name: request.name,
      type: request.type,
      description: request.description,
      capacity_per_day: request.capacity_per_day || 8,
      cost_per_unit: request.cost_per_unit || 0,
      available_from: request.available_from,
      available_to: request.available_to,
      is_active: true,
      created_at: now,
      updated_at: now,
    };
  }

  /**
   * Update an existing resource
   */
  public static updateResource(resource: Resource, updates: Partial<Resource>): Resource {
    return {
      ...resource,
      ...updates,
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Create a resource assignment
   */
  public static createAssignment(request: CreateAssignmentRequest): TaskAssignment {
    const now = new Date().toISOString();

    return {
      id: crypto.randomUUID() as UUID,
      task_id: request.task_id,
      resource_id: request.resource_id,
      allocation_percentage: request.allocation_percentage || 100,
      assigned_quantity: request.assigned_quantity || 1,
      notes: request.notes,
      created_at: now,
      updated_at: now,
    };
  }

  /**
   * Update an existing assignment
   */
  public static updateAssignment(
    assignment: TaskAssignment,
    updates: UpdateAssignmentRequest
  ): TaskAssignment {
    return {
      ...assignment,
      ...updates,
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Check for resource conflicts
   */
  public static checkResourceConflicts(
    resource: Resource,
    assignments: TaskAssignment[],
    tasks: Task[],
    excludeTaskId?: UUID
  ): ResourceConflict[] {
    const conflicts: ResourceConflict[] = [];
    const resourceAssignments = assignments.filter(
      assignment => assignment.resource_id === resource.id
    );

    // Check each assignment against all others
    for (let i = 0; i < resourceAssignments.length; i++) {
      for (let j = i + 1; j < resourceAssignments.length; j++) {
        const assign1 = resourceAssignments[i];
        const assign2 = resourceAssignments[j];

        // Skip if one of the assignments is the excluded task
        if (excludeTaskId && (assign1.task_id === excludeTaskId || assign2.task_id === excludeTaskId)) {
          continue;
        }

        const task1 = tasks.find(t => t.id === assign1.task_id);
        const task2 = tasks.find(t => t.id === assign2.task_id);

        if (!task1 || !task2) continue;
        if (task1.status === 'completed' || task2.status === 'completed') continue;

        // Check for date overlap
        if (this.doTasksOverlap(task1, task2)) {
          const totalAllocation = assign1.allocation_percentage + assign2.allocation_percentage;
          if (totalAllocation > 100) {
            conflicts.push({
              task_id: assign2.task_id,
              task_name: task2.name,
              conflict_start: task1.planned_start_date!,
              conflict_end: task1.planned_end_date!,
              conflict_percentage: totalAllocation,
            });
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Check if two tasks overlap in time
   */
  private static doTasksOverlap(task1: Task, task2: Task): boolean {
    if (!task1.planned_start_date || !task1.planned_end_date ||
        !task2.planned_start_date || !task2.planned_end_date) {
      return false;
    }

    const start1 = new Date(task1.planned_start_date);
    const end1 = new Date(task1.planned_end_date);
    const start2 = new Date(task2.planned_start_date);
    const end2 = new Date(task2.planned_end_date);

    return start1 < end2 && start2 < end1;
  }

  /**
   * Calculate resource utilization
   */
  public static calculateResourceUtilization(
    resource: Resource,
    assignments: TaskAssignment[],
    tasks: Task[],
    startDate: Date,
    endDate: Date
  ): number {
    const resourceAssignments = assignments.filter(
      assignment => assignment.resource_id === resource.id
    );

    let totalAllocatedDays = 0;
    let totalAvailableDays = differenceInDays(endDate, startDate) + 1;

    resourceAssignments.forEach(assignment => {
      const task = tasks.find(t => t.id === assignment.task_id);
      if (!task || task.status === 'completed') return;

      if (task.planned_start_date && task.planned_end_date) {
        const taskStart = new Date(task.planned_start_date);
        const taskEnd = new Date(task.planned_end_date);

        // Calculate overlap between task and date range
        const overlapStart = new Date(Math.max(taskStart.getTime(), startDate.getTime()));
        const overlapEnd = new Date(Math.min(taskEnd.getTime(), endDate.getTime()));

        if (overlapStart <= overlapEnd) {
          const overlapDays = differenceInDays(overlapEnd, overlapStart) + 1;
          const allocatedDays = overlapDays * (assignment.allocation_percentage / 100);
          totalAllocatedDays += allocatedDays;
        }
      }
    });

    return totalAvailableDays > 0 ? Math.min(100, (totalAllocatedDays / totalAvailableDays) * 100) : 0;
  }

  /**
   * Generate resource heatmap data
   */
  public static generateResourceHeatmap(
    resource: Resource,
    assignments: TaskAssignment[],
    tasks: Task[],
    startDate: Date,
    endDate: Date
  ): ResourceHeatmapData {
    const dates: ResourceHeatmapData['dates'] = [];
    const resourceAssignments = assignments.filter(
      assignment => assignment.resource_id === resource.id
    );

    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];

      // Calculate utilization for this date
      let totalAllocation = 0;
      let allocatedTasks = 0;
      let conflicts = 0;

      resourceAssignments.forEach(assignment => {
        const task = tasks.find(t => t.id === assignment.task_id);
        if (!task || task.status === 'completed') return;

        if (task.planned_start_date && task.planned_end_date) {
          const taskStart = new Date(task.planned_start_date);
          const taskEnd = new Date(task.planned_end_date);

          if (isWithinInterval(currentDate, { start: taskStart, end: taskEnd })) {
            totalAllocation += assignment.allocation_percentage;
            allocatedTasks++;
          }
        }
      });

      // Count conflicts for this date
      if (totalAllocation > 100) {
        conflicts = Math.floor(totalAllocation / 100);
      }

      dates.push({
        date: dateStr,
        utilization: Math.min(100, totalAllocation),
        allocated_tasks: allocatedTasks,
        available_capacity: Math.max(0, 100 - totalAllocation),
        conflicts,
      });

      currentDate = addDays(currentDate, 1);
    }

    return {
      resource_id: resource.id,
      resource_name: resource.name,
      dates,
    };
  }

  /**
   * Get available resources for a task
   */
  public static getAvailableResources(
    resources: Resource[],
    assignments: TaskAssignment[],
    tasks: Task[],
    taskStartDate: Date,
    taskEndDate: Date,
    resourceType?: Resource['type']
  ): Resource[] {
    return resources.filter(resource => {
      // Check if resource is active and matches type
      if (!resource.is_active) return false;
      if (resourceType && resource.type !== resourceType) return false;

      // Check availability dates
      if (resource.available_from && new Date(resource.available_from) > taskStartDate) return false;
      if (resource.available_to && new Date(resource.available_to) < taskEndDate) return false;

      // Check for conflicts during task period
      const resourceAssignments = assignments.filter(
        assignment => assignment.resource_id === resource.id
      );

      const hasConflict = resourceAssignments.some(assignment => {
        const assignedTask = tasks.find(t => t.id === assignment.task_id);
        if (!assignedTask || assignedTask.status === 'completed') return false;

        if (!assignedTask.planned_start_date || !assignedTask.planned_end_date) return false;

        const assignedStart = new Date(assignedTask.planned_start_date);
        const assignedEnd = new Date(assignedTask.planned_end_date);

        // Check for date overlap
        return assignedStart <= taskEndDate && assignedEnd >= taskStartDate;
      });

      return !hasConflict;
    });
  }

  /**
   * Suggest resource assignments for a task
   */
  public static suggestResourceAssignments(
    resources: Resource[],
    assignments: TaskAssignment[],
    tasks: Task[],
    task: Task,
    requiredType?: Resource['type']
  ): { resource: Resource; suggestion: 'high' | 'medium' | 'low' }[] {
    if (!task.planned_start_date || !task.planned_end_date) {
      return [];
    }

    const taskStartDate = new Date(task.planned_start_date);
    const taskEndDate = new Date(task.planned_end_date);
    const availableResources = this.getAvailableResources(
      resources,
      assignments,
      tasks,
      taskStartDate,
      taskEndDate,
      requiredType
    );

    return availableResources.map(resource => {
      // Calculate how well this resource matches the task
      let score = 0;

      // Higher score for resources with appropriate capacity
      if (resource.capacity_per_day >= 8) score += 2;
      else if (resource.capacity_per_day >= 4) score += 1;

      // Higher score for resources with cost within reasonable range
      if (resource.cost_per_unit <= 100) score += 1;

      // Check historical assignments (if we had that data)
      const resourceAssignments = assignments.filter(
        assignment => assignment.resource_id === resource.id
      );

      if (resourceAssignments.length > 5) score += 1; // Experienced resource
      else if (resourceAssignments.length > 2) score += 0.5;

      let suggestion: 'high' | 'medium' | 'low' = 'low';
      if (score >= 3) suggestion = 'high';
      else if (score >= 1.5) suggestion = 'medium';

      return { resource, suggestion };
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * Optimize resource allocation across all tasks
   */
  public static optimizeResourceAllocation(
    resources: Resource[],
    assignments: TaskAssignment[],
    tasks: Task[]
  ): { optimizedAssignments: TaskAssignment[]; conflicts: ResourceConflict[] } {
    const optimizedAssignments = [...assignments];
    const conflicts: ResourceConflict[] = [];

    // Sort tasks by priority and start date
    const sortedTasks = tasks
      .filter(task => task.planned_start_date && task.planned_end_date)
      .sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;

        return new Date(a.planned_start_date!).getTime() - new Date(b.planned_start_date!).getTime();
      });

    // Optimize each task's resource allocation
    sortedTasks.forEach(task => {
      const taskAssignments = optimizedAssignments.filter(
        assignment => assignment.task_id === task.id
      );

      taskAssignments.forEach(assignment => {
        const resource = resources.find(r => r.id === assignment.resource_id);
        if (!resource) return;

        // Check for conflicts
        const resourceConflicts = this.checkResourceConflicts(
          resource,
          optimizedAssignments,
          tasks,
          task.id
        );

        if (resourceConflicts.length > 0) {
          // Try to find alternative resources
          const alternatives = this.getAvailableResources(
            resources,
            optimizedAssignments.filter(a => a.resource_id !== resource.id),
            tasks,
            new Date(task.planned_start_date!),
            new Date(task.planned_end_date!),
            resource.type
          );

          if (alternatives.length > 0) {
            // Assign to the best alternative
            const assignmentIndex = optimizedAssignments.findIndex(
              a => a.id === assignment.id
            );
            if (assignmentIndex !== -1) {
              optimizedAssignments[assignmentIndex] = {
                ...optimizedAssignments[assignmentIndex],
                resource_id: alternatives[0].id,
                updated_at: new Date().toISOString(),
              };
            }
          } else {
            // No alternative available, try to reduce allocation
            const assignmentIndex = optimizedAssignments.findIndex(
              a => a.id === assignment.id
            );
            if (assignmentIndex !== -1) {
              const newAllocation = Math.max(25, assignment.allocation_percentage - 25);
              optimizedAssignments[assignmentIndex] = {
                ...optimizedAssignments[assignmentIndex],
                allocation_percentage: newAllocation,
                updated_at: new Date().toISOString(),
              };
            }

            conflicts.push(...resourceConflicts);
          }
        }
      });
    });

    return { optimizedAssignments, conflicts };
  }

  /**
   * Calculate resource cost for a task
   */
  public static calculateTaskResourceCost(
    taskId: UUID,
    assignments: TaskAssignment[],
    resources: Resource[],
    tasks: Task[]
  ): number {
    const taskAssignments = assignments.filter(assignment => assignment.task_id === taskId);
    const task = tasks.find(t => t.id === taskId);

    if (!task || !task.planned_start_date || !task.planned_end_date) {
      return 0;
    }

    const taskStart = new Date(task.planned_start_date);
    const taskEnd = new Date(task.planned_end_date);
    const taskDays = differenceInDays(taskEnd, taskStart) + 1;

    return taskAssignments.reduce((total, assignment) => {
      const resource = resources.find(r => r.id === assignment.resource_id);
      if (!resource) return total;

      const dailyCost = (resource.cost_per_unit * assignment.assigned_quantity *
                        assignment.allocation_percentage) / 100;
      return total + (dailyCost * taskDays);
    }, 0);
  }

  /**
   * Get resource utilization summary
   */
  public static getResourceUtilizationSummary(
    resources: Resource[],
    assignments: TaskAssignment[],
    tasks: Task[],
    startDate: Date,
    endDate: Date
  ): Array<{
    resource: Resource;
    utilization: number;
    totalCost: number;
    conflictCount: number;
    availableDays: number;
  }> {
    return resources.map(resource => {
      const utilization = this.calculateResourceUtilization(resource, assignments, tasks, startDate, endDate);
      const conflicts = this.checkResourceConflicts(resource, assignments, tasks);

      // Calculate total cost for this resource during the period
      const totalCost = this.calculateResourceCost(
        resource.id,
        assignments,
        resources,
        tasks,
        startDate,
        endDate
      );

      const availableDays = differenceInDays(endDate, startDate) + 1;

      return {
        resource,
        utilization,
        totalCost,
        conflictCount: conflicts.length,
        availableDays,
      };
    });
  }

  /**
   * Calculate resource cost for a period
   */
  private static calculateResourceCost(
    resourceId: UUID,
    assignments: TaskAssignment[],
    resources: Resource[],
    tasks: Task[],
    startDate: Date,
    endDate: Date
  ): number {
    const resource = resources.find(r => r.id === resourceId);
    if (!resource) return 0;

    const resourceAssignments = assignments.filter(
      assignment => assignment.resource_id === resourceId
    );

    return resourceAssignments.reduce((total, assignment) => {
      const task = tasks.find(t => t.id === assignment.task_id);
      if (!task || !task.planned_start_date || !task.planned_end_date) return total;

      const taskStart = new Date(task.planned_start_date);
      const taskEnd = new Date(task.planned_end_date);

      // Calculate overlap with date range
      const overlapStart = new Date(Math.max(taskStart.getTime(), startDate.getTime()));
      const overlapEnd = new Date(Math.min(taskEnd.getTime(), endDate.getTime()));

      if (overlapStart <= overlapEnd) {
        const overlapDays = differenceInDays(overlapEnd, overlapStart) + 1;
        const dailyCost = resource.cost_per_unit * assignment.assigned_quantity *
                         (assignment.allocation_percentage / 100);
        return total + (dailyCost * overlapDays);
      }

      return total;
    }, 0);
  }
}