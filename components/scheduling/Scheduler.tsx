'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, addDays, differenceInDays } from 'date-fns';
import {
  Calendar,
  ListTodo,
  Users,
  BarChart3,
  Settings,
  Play,
  Pause,
  RotateCcw,
  Save,
  Download,
  Upload,
  Bell,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Clock,
  DollarSign,
  Plus,
  Filter,
} from 'lucide-react';

import {
  Schedule,
  Task,
  TaskDependency,
  Resource,
  TaskAssignment,
  GanttTask,
  GanttViewMode,
  GanttDateRange,
  ScheduleScenario,
  ProjectTimelineSummary,
} from '@/types/scheduling';

import { GanttChart } from './GanttChart';
import { TaskList } from './TaskList';
import { ResourceAllocation } from './ResourceAllocation';
import { Timeline } from './Timeline';
import { schedulingEngine } from '@/lib/scheduling/scheduler';
import { TaskManager } from '@/lib/scheduling/taskManager';
import { ResourceManager } from '@/lib/scheduling/resourceManager';
import { CriticalPathAnalyzer } from '@/lib/scheduling/criticalPath';
import { GanttChartProcessor } from '@/lib/scheduling/ganttChart';

interface SchedulerProps {
  schedule: Schedule;
  tasks: Task[];
  dependencies: TaskDependency[];
  resources: Resource[];
  assignments: TaskAssignment[];
  onScheduleUpdate?: (schedule: Partial<Schedule>) => void;
  onTaskCreate?: (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete?: (taskId: string) => void;
  onDependencyCreate?: (dependency: Omit<TaskDependency, 'id' | 'created_at'>) => void;
  onDependencyDelete?: (dependencyId: string) => void;
  onResourceCreate?: (resource: Omit<Resource, 'id' | 'created_at' | 'updated_at'>) => void;
  onResourceUpdate?: (resourceId: string, updates: Partial<Resource>) => void;
  onResourceDelete?: (resourceId: string) => void;
  onAssignmentCreate?: (assignment: Omit<TaskAssignment, 'id' | 'created_at' | 'updated_at'>) => void;
  onAssignmentUpdate?: (assignmentId: string, updates: Partial<TaskAssignment>) => void;
  onAssignmentDelete?: (assignmentId: string) => void;
  className?: string;
}

export const Scheduler: React.FC<SchedulerProps> = ({
  schedule,
  tasks,
  dependencies,
  resources,
  assignments,
  onScheduleUpdate,
  onTaskCreate,
  onTaskUpdate,
  onTaskDelete,
  onDependencyCreate,
  onDependencyDelete,
  onResourceCreate,
  onResourceUpdate,
  onResourceDelete,
  onAssignmentCreate,
  onAssignmentUpdate,
  onAssignmentDelete,
  className = '',
}) => {
  // State management
  const [activeView, setActiveView] = useState<'gantt' | 'tasks' | 'resources' | 'timeline'>('gantt');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [viewMode, setViewMode] = useState<GanttViewMode>({ mode: 'week', step: 1 });
  const [dateRange, setDateRange] = useState<GanttDateRange>(
    GanttChartProcessor.calculateOptimalDateRange(tasks)
  );
  const [autoSchedule, setAutoSchedule] = useState(false);
  const [schedulingInProgress, setSchedulingInProgress] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [scenarios, setScenarios] = useState<ScheduleScenario[]>([]);
  const [activeScenario, setActiveScenario] = useState<ScheduleScenario | null>(null);

  // Calculate project statistics
  const projectStats = useMemo(() => {
    return {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      inProgressTasks: tasks.filter(t => t.status === 'in_progress').length,
      delayedTasks: tasks.filter(t => t.status === 'delayed').length,
      totalDuration: CriticalPathAnalyzer.getProjectDuration(tasks),
      totalCost: tasks.reduce((sum, task) => sum + task.estimated_cost, 0),
      resourceCount: resources.length,
      averageProgress: tasks.length > 0 ? tasks.reduce((sum, task) => sum + task.progress_percentage, 0) / tasks.length : 0,
    };
  }, [tasks, resources]);

  // Calculate critical path
  const criticalPath = useMemo(() => {
    return CriticalPathAnalyzer.calculateCriticalPath(tasks, dependencies);
  }, [tasks, dependencies]);

  // Process tasks for Gantt chart
  const ganttTasks = useMemo(() => {
    return GanttChartProcessor.processTasks(tasks, dependencies, resources, assignments);
  }, [tasks, dependencies, resources, assignments]);

  // Process resources for allocation view
  const allocationData = useMemo(() => {
    return GanttChartProcessor.processResources(resources, assignments, tasks);
  }, [resources, assignments, tasks]);

  // Handle auto-scheduling
  const handleAutoSchedule = useCallback(async () => {
    setSchedulingInProgress(true);
    try {
      const result = schedulingEngine.scheduleTasks(tasks, dependencies, resources, assignments);

      if (result.success) {
        // Update all tasks with new dates
        result.tasks.forEach(updatedTask => {
          onTaskUpdate?.(updatedTask.id, {
            planned_start_date: updatedTask.planned_start_date,
            planned_end_date: updatedTask.planned_end_date,
            is_critical_path: updatedTask.is_critical_path,
          });
        });

        // Show conflicts if any
        if (result.conflicts.length > 0) {
          alert(`Scheduling complete with ${result.conflicts.length} resource conflicts. Review the Resources tab for details.`);
        }
      } else {
        alert(`Scheduling failed: ${result.warnings.join(', ')}`);
      }
    } catch (error) {
      console.error('Scheduling error:', error);
      alert('An error occurred during scheduling. Please try again.');
    } finally {
      setSchedulingInProgress(false);
    }
  }, [tasks, dependencies, resources, assignments, onTaskUpdate]);

  // Handle manual task updates
  const handleTaskUpdate = useCallback((taskId: string, updates: Partial<Task>) => {
    onTaskUpdate?.(taskId, updates);

    // If auto-schedule is enabled, reschedule
    if (autoSchedule) {
      handleAutoSchedule();
    }
  }, [autoSchedule, onTaskUpdate, handleAutoSchedule]);

  // Handle view mode changes
  const handleViewModeChange = useCallback((newMode: GanttViewMode) => {
    setViewMode(newMode);
  }, []);

  // Handle date range changes
  const handleDateRangeChange = useCallback((newRange: GanttDateRange) => {
    setDateRange(newRange);
  }, []);

  // Handle task selection
  const handleTaskSelect = useCallback((task: Task) => {
    setSelectedTask(task);
  }, []);

  // Export schedule data
  const handleExport = useCallback(() => {
    const exportData = {
      schedule,
      tasks,
      dependencies,
      resources,
      assignments,
      criticalPath,
      projectStats,
      exportDate: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schedule-${schedule.name}-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [schedule, tasks, dependencies, resources, assignments, criticalPath, projectStats]);

  // Save schedule state
  const handleSave = useCallback(() => {
    // This would trigger a save to the backend
    console.log('Saving schedule state...');
    // Implementation would depend on your data persistence layer
  }, []);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">{schedule.name}</h1>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(schedule.start_date), 'MMM dd, yyyy')}</span>
              {schedule.end_date && (
                <>
                  <span>-</span>
                  <span>{format(new Date(schedule.end_date), 'MMM dd, yyyy')}</span>
                </>
              )}
            </div>
            <div className={`px-2 py-1 text-xs font-medium rounded-full ${
              schedule.status === 'active' ? 'bg-green-100 text-green-800' :
              schedule.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
              schedule.status === 'completed' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {schedule.status.replace('_', ' ').toUpperCase()}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Auto-schedule toggle */}
            <button
              onClick={() => setAutoSchedule(!autoSchedule)}
              className={`flex items-center space-x-1 px-3 py-1 text-sm rounded-md ${
                autoSchedule ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {autoSchedule ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              <span>Auto-Schedule</span>
            </button>

            {/* Manual schedule button */}
            {!autoSchedule && (
              <button
                onClick={handleAutoSchedule}
                disabled={schedulingInProgress}
                className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <RotateCcw className={`h-3 w-3 ${schedulingInProgress ? 'animate-spin' : ''}`} />
                <span>{schedulingInProgress ? 'Scheduling...' : 'Schedule Now'}</span>
              </button>
            )}

            {/* Actions */}
            <div className="flex items-center space-x-1 border-l border-gray-300 pl-2">
              <button
                onClick={handleSave}
                className="p-1 text-gray-600 hover:text-gray-900"
                title="Save"
              >
                <Save className="h-4 w-4" />
              </button>
              <button
                onClick={handleExport}
                className="p-1 text-gray-600 hover:text-gray-900"
                title="Export"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-1 text-gray-600 hover:text-gray-900"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Statistics bar */}
        <div className="flex items-center space-x-6 mt-3 text-sm">
          <div className="flex items-center space-x-2">
            <ListTodo className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">Tasks:</span>
            <span className="font-medium text-gray-900">{projectStats.totalTasks}</span>
            <span className="text-green-600">({projectStats.completedTasks} done)</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">Duration:</span>
            <span className="font-medium text-gray-900">{projectStats.totalDuration} days</span>
          </div>
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">Budget:</span>
            <span className="font-medium text-gray-900">${projectStats.totalCost.toLocaleString()}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">Resources:</span>
            <span className="font-medium text-gray-900">{projectStats.resourceCount}</span>
          </div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">Progress:</span>
            <span className="font-medium text-gray-900">{Math.round(projectStats.averageProgress)}%</span>
          </div>
          {criticalPath.length > 0 && (
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-red-600">Critical Path: {criticalPath.length} tasks</span>
            </div>
          )}
        </div>
      </div>

      {/* View tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveView('gantt')}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeView === 'gantt'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Gantt Chart</span>
            </div>
          </button>
          <button
            onClick={() => setActiveView('tasks')}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeView === 'tasks'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <ListTodo className="h-4 w-4" />
              <span>Task List</span>
            </div>
          </button>
          <button
            onClick={() => setActiveView('resources')}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeView === 'resources'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Resources</span>
            </div>
          </button>
          <button
            onClick={() => setActiveView('timeline')}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeView === 'timeline'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Timeline</span>
            </div>
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {activeView === 'gantt' && (
          <GanttChart
            tasks={ganttTasks}
            resources={allocationData}
            viewMode={viewMode}
            dateRange={dateRange}
            onTaskSelect={(ganttTask) => {
              const task = tasks.find(t => t.id === ganttTask.id);
              if (task) handleTaskSelect(task);
            }}
            onTaskUpdate={(taskId, updates) => {
              const task = tasks.find(t => t.id === taskId);
              if (task) {
                handleTaskUpdate(taskId, {
                  planned_start_date: updates.start?.toISOString(),
                  planned_end_date: updates.end?.toISOString(),
                  progress_percentage: updates.progress,
                });
              }
            }}
            onViewModeChange={handleViewModeChange}
            onDateRangeChange={handleDateRangeChange}
          />
        )}

        {activeView === 'tasks' && (
          <TaskList
            tasks={tasks}
            dependencies={dependencies}
            resources={resources}
            assignments={assignments}
            onTaskCreate={onTaskCreate}
            onTaskUpdate={handleTaskUpdate}
            onTaskDelete={onTaskDelete}
            onDependencyCreate={(predecessorId, successorId, type) => {
              onDependencyCreate?.({
                predecessor_id: predecessorId,
                successor_id: successorId,
                dependency_type: type,
                lag_days: 0,
              });
            }}
            onDependencyDelete={(predecessorId, successorId) => {
              const dependency = dependencies.find(
                d => d.predecessor_id === predecessorId && d.successor_id === successorId
              );
              if (dependency) {
                onDependencyDelete?.(dependency.id);
              }
            }}
            onAssignmentCreate={(taskId, resourceId, allocation) => {
              onAssignmentCreate?.({
                task_id: taskId,
                resource_id: resourceId,
                allocation_percentage: allocation,
                assigned_quantity: 1,
              });
            }}
            onAssignmentDelete={(taskId, resourceId) => {
              const assignment = assignments.find(
                a => a.task_id === taskId && a.resource_id === resourceId
              );
              if (assignment) {
                onAssignmentDelete?.(assignment.id);
              }
            }}
            selectedTaskId={selectedTask?.id}
            onTaskSelect={(taskId) => {
              const task = tasks.find(t => t.id === taskId);
              if (task) handleTaskSelect(task);
            }}
          />
        )}

        {activeView === 'resources' && (
          <ResourceAllocation
            resources={resources}
            assignments={assignments}
            tasks={tasks}
            onResourceCreate={onResourceCreate}
            onResourceUpdate={onResourceUpdate}
            onResourceDelete={onResourceDelete}
            onAssignmentCreate={(assignment) => {
              onAssignmentCreate?.(assignment);
              if (autoSchedule) {
                handleAutoSchedule();
              }
            }}
            onAssignmentUpdate={onAssignmentUpdate}
            onAssignmentDelete={onAssignmentDelete}
            dateRange={{ start: dateRange.start, end: dateRange.end }}
          />
        )}

        {activeView === 'timeline' && (
          <Timeline
            tasks={tasks}
            startDate={dateRange.start}
            endDate={dateRange.end}
            onTaskSelect={handleTaskSelect}
            onDateRangeChange={(start, end) => {
              setDateRange({ start, end });
            }}
            scale={viewMode.mode === 'day' ? 'day' : viewMode.mode === 'week' ? 'week' : 'month'}
          />
        )}
      </div>

      {/* Task details panel (shown when task is selected) */}
      {selectedTask && (
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">{selectedTask.name}</h3>
              <p className="text-sm text-gray-500">
                {selectedTask.planned_start_date && format(new Date(selectedTask.planned_start_date), 'MMM dd, yyyy')} -
                {selectedTask.planned_end_date && format(new Date(selectedTask.planned_end_date), 'MMM dd, yyyy')}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Status: <span className="font-medium capitalize">{selectedTask.status.replace('_', ' ')}</span>
              </div>
              <div className="text-sm text-gray-600">
                Priority: <span className="font-medium capitalize">{selectedTask.priority}</span>
              </div>
              <div className="text-sm text-gray-600">
                Progress: {selectedTask.progress_percentage}%
              </div>
              {selectedTask.estimated_cost > 0 && (
                <div className="text-sm text-gray-600">
                  Cost: ${selectedTask.estimated_cost.toLocaleString()}
                </div>
              )}
              <button
                onClick={() => setSelectedTask(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};