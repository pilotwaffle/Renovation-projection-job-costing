'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { format, addDays, differenceInDays, isAfter, isBefore } from 'date-fns';
import {
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Calendar,
  Clock,
  User,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  Square,
  Flag,
  Filter,
  Search,
  MoreVertical,
  Link,
  Unlink,
} from 'lucide-react';

import { Task, TaskDependency, Resource, TaskAssignment } from '@/types/scheduling';
import { TaskManager } from '@/lib/scheduling/taskManager';

interface TaskListProps {
  tasks: Task[];
  dependencies?: TaskDependency[];
  resources?: Resource[];
  assignments?: TaskAssignment[];
  onTaskCreate?: (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete?: (taskId: string) => void;
  onDependencyCreate?: (predecessorId: string, successorId: string, type: TaskDependency['dependency_type']) => void;
  onDependencyDelete?: (predecessorId: string, successorId: string) => void;
  onAssignmentCreate?: (taskId: string, resourceId: string, allocation: number) => void;
  onAssignmentDelete?: (taskId: string, resourceId: string) => void;
  selectedTaskId?: string;
  onTaskSelect?: (taskId: string) => void;
  filters?: {
    status?: string[];
    priority?: string[];
    dateRange?: { start: Date; end: Date };
    searchText?: string;
  };
  className?: string;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  dependencies = [],
  resources = [],
  assignments = [],
  onTaskCreate,
  onTaskUpdate,
  onTaskDelete,
  onDependencyCreate,
  onDependencyDelete,
  onAssignmentCreate,
  onAssignmentDelete,
  selectedTaskId,
  onTaskSelect,
  filters,
  className = '',
}) => {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  // Build task hierarchy
  const taskHierarchy = TaskManager.buildTaskHierarchy(tasks);
  const rootTasks = taskHierarchy.get('root') || [];

  // Filter tasks
  const filteredTasks = React.useMemo(() => {
    let filtered = tasks;

    // Status filter
    if (filters?.status && filters.status.length > 0) {
      filtered = filtered.filter(task => filters.status!.includes(task.status));
    }

    // Priority filter
    if (filters?.priority && filters.priority.length > 0) {
      filtered = filtered.filter(task => filters.priority!.includes(task.priority));
    }

    // Date range filter
    if (filters?.dateRange) {
      filtered = filtered.filter(task => {
        if (!task.planned_start_date || !task.planned_end_date) return true;
        const taskStart = new Date(task.planned_start_date);
        const taskEnd = new Date(task.planned_end_date);
        return !isBefore(taskEnd, filters.dateRange!.start) && !isAfter(taskStart, filters.dateRange!.end);
      });
    }

    // Search filter
    if (filters?.searchText || searchTerm) {
      const search = (filters?.searchText || searchTerm).toLowerCase();
      filtered = filtered.filter(task =>
        task.name.toLowerCase().includes(search) ||
        task.description?.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [tasks, filters, searchTerm]);

  // Get task statistics
  const taskStats = TaskManager.calculateTaskStats(filteredTasks);

  // Toggle task expansion
  const toggleTaskExpansion = useCallback((taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  // Get status icon and color
  const getStatusInfo = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100' };
      case 'in_progress':
        return { icon: Play, color: 'text-blue-500', bg: 'bg-blue-100' };
      case 'not_started':
        return { icon: Square, color: 'text-gray-400', bg: 'bg-gray-100' };
      case 'delayed':
        return { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-100' };
      case 'blocked':
        return { icon: Pause, color: 'text-red-500', bg: 'bg-red-100' };
      default:
        return { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-100' };
    }
  };

  // Get priority icon and color
  const getPriorityInfo = (priority: Task['priority']) => {
    switch (priority) {
      case 'critical':
        return { icon: Flag, color: 'text-red-500', bg: 'bg-red-100' };
      case 'high':
        return { icon: Flag, color: 'text-amber-500', bg: 'bg-amber-100' };
      case 'normal':
        return { icon: Flag, color: 'text-blue-500', bg: 'bg-blue-100' };
      case 'low':
        return { icon: Flag, color: 'text-green-500', bg: 'bg-green-100' };
      default:
        return { icon: Flag, color: 'text-gray-400', bg: 'bg-gray-100' };
    }
  };

  // Get task dependencies
  const getTaskDependencies = (taskId: string) => {
    return dependencies.filter(dep => dep.successor_id === taskId || dep.predecessor_id === taskId);
  };

  // Get task assignments
  const getTaskAssignments = (taskId: string) => {
    return assignments.filter(a => a.task_id === taskId);
  };

  // Handle task click
  const handleTaskClick = (task: Task) => {
    onTaskSelect?.(task.id);
  };

  // Handle task edit
  const handleTaskEdit = (task: Task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  // Handle task save
  const handleTaskSave = (taskData: Partial<Task>) => {
    if (editingTask) {
      onTaskUpdate?.(editingTask.id, taskData);
    } else {
      onTaskCreate?.(taskData as Omit<Task, 'id' | 'created_at' | 'updated_at'>);
    }
    setShowTaskForm(false);
    setEditingTask(null);
  };

  // Handle drag and drop for dependencies
  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'link';
  };

  const handleDrop = (e: React.DragEvent, targetTask: Task) => {
    e.preventDefault();
    if (!draggedTask || draggedTask.id === targetTask.id || !onDependencyCreate) return;

    // Create finish-to-start dependency
    onDependencyCreate(draggedTask.id, targetTask.id, 'finish_to_start');
    setDraggedTask(null);
  };

  // Render task row
  const renderTaskRow = (task: Task, level: number = 0): React.ReactNode => {
    const isExpanded = expandedTasks.has(task.id);
    const hasChildren = taskHierarchy.has(task.id);
    const isSelected = selectedTaskId === task.id;
    const taskDependencies = getTaskDependencies(task.id);
    const taskAssignments = getTaskAssignments(task.id);

    const statusInfo = getStatusInfo(task.status);
    const priorityInfo = getPriorityInfo(task.priority);
    const StatusIcon = statusInfo.icon;
    const PriorityIcon = priorityInfo.icon;

    return (
      <div key={task.id} className="border-b border-gray-200">
        <div
          className={`flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer ${
            isSelected ? 'bg-blue-50' : ''
          }`}
          style={{ paddingLeft: `${12 + level * 20}px` }}
          onClick={() => handleTaskClick(task)}
          draggable
          onDragStart={() => handleDragStart(task)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, task)}
        >
          {/* Expand/collapse */}
          <div className="w-5 h-5 flex items-center justify-center mr-2">
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTaskExpansion(task.id);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4" />
                )}
              </button>
            )}
          </div>

          {/* Status */}
          <div className="w-6 h-6 flex items-center justify-center mr-2">
            <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
          </div>

          {/* Task name and type */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900 truncate">{task.name}</span>
              {task.type === 'milestone' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                  Milestone
                </span>
              )}
              {task.type === 'summary' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  Summary
                </span>
              )}
            </div>
            {task.description && (
              <p className="text-sm text-gray-500 truncate">{task.description}</p>
            )}
          </div>

          {/* Priority */}
          <div className="w-6 h-6 flex items-center justify-center mr-3">
            <PriorityIcon className={`h-4 w-4 ${priorityInfo.color}`} />
          </div>

          {/* Dates */}
          <div className="flex items-center text-sm text-gray-600 mr-4">
            <Calendar className="h-3 w-3 mr-1" />
            {task.planned_start_date ? format(new Date(task.planned_start_date), 'MMM dd') : 'No date'}
            {task.planned_end_date && (
              <>
                <span className="mx-1">-</span>
                {format(new Date(task.planned_end_date), 'MMM dd')}
              </>
            )}
          </div>

          {/* Duration */}
          <div className="flex items-center text-sm text-gray-600 mr-4">
            <Clock className="h-3 w-3 mr-1" />
            {task.duration_days}d
          </div>

          {/* Progress */}
          <div className="flex items-center mr-4">
            <div className="w-20">
              <div className="flex items-center">
                <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${task.progress_percentage}%` }}
                  />
                </div>
                <span className="text-xs text-gray-600">{task.progress_percentage}%</span>
              </div>
            </div>
          </div>

          {/* Assignments */}
          {taskAssignments.length > 0 && (
            <div className="flex items-center mr-4">
              <div className="flex -space-x-1">
                {taskAssignments.slice(0, 3).map((assignment) => {
                  const resource = resources.find(r => r.id === assignment.resource_id);
                  return (
                    <div
                      key={assignment.id}
                      className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium border-2 border-white"
                      title={resource?.name}
                    >
                      {resource?.name.charAt(0).toUpperCase()}
                    </div>
                  );
                })}
                {taskAssignments.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs font-medium border-2 border-white">
                    +{taskAssignments.length - 3}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dependencies */}
          {taskDependencies.length > 0 && (
            <div className="flex items-center mr-4">
              <Link className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-500 ml-1">{taskDependencies.length}</span>
            </div>
          )}

          {/* Cost */}
          <div className="flex items-center text-sm text-gray-600 mr-4">
            <DollarSign className="h-3 w-3 mr-1" />
            {task.estimated_cost.toLocaleString()}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleTaskEdit(task);
              }}
              className="p-1 text-gray-400 hover:text-blue-600"
            >
              <Edit2 className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTaskDelete?.(task.id);
              }}
              className="p-1 text-gray-400 hover:text-red-600"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Render children if expanded */}
        {hasChildren && isExpanded && (
          <div>
            {taskHierarchy.get(task.id)?.map(child => renderTaskRow(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>Total: {taskStats.total}</span>
            <span>•</span>
            <span className="text-green-600">Completed: {taskStats.completed}</span>
            <span>•</span>
            <span className="text-blue-600">In Progress: {taskStats.inProgress}</span>
            <span>•</span>
            <span className="text-gray-600">Not Started: {taskStats.notStarted}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Search */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tasks..."
              className="pl-8 pr-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-1 px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Filter className="h-3 w-3" />
            <span>Filters</span>
          </button>

          {/* Add task */}
          <button
            onClick={() => {
              setEditingTask(null);
              setShowTaskForm(true);
            }}
            className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="h-3 w-3" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-700 uppercase tracking-wider">
        <div className="w-5 mr-2" />
        <div className="w-6 mr-2">Status</div>
        <div className="flex-1">Task</div>
        <div className="w-6 mr-3">Priority</div>
        <div className="w-32 mr-4">Dates</div>
        <div className="w-16 mr-4">Duration</div>
        <div className="w-24 mr-4">Progress</div>
        <div className="w-20 mr-4">Assigned</div>
        <div className="w-16 mr-4">Deps</div>
        <div className="w-20 mr-4">Cost</div>
        <div className="w-16">Actions</div>
      </div>

      {/* Task list */}
      <div className="max-h-96 overflow-y-auto">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No tasks found. Create your first task to get started.
          </div>
        ) : (
          rootTasks.map(task => renderTaskRow(task))
        )}
      </div>

      {/* Task form modal - would be implemented as a separate component */}
      {showTaskForm && (
        <TaskForm
          task={editingTask}
          resources={resources}
          onSave={handleTaskSave}
          onCancel={() => {
            setShowTaskForm(false);
            setEditingTask(null);
          }}
        />
      )}
    </div>
  );
};

// Task form component (simplified version)
const TaskForm: React.FC<{
  task?: Task | null;
  resources: Resource[];
  onSave: (task: Partial<Task>) => void;
  onCancel: () => void;
}> = ({ task, resources, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: task?.name || '',
    description: task?.description || '',
    type: task?.type || 'task' as Task['type'],
    priority: task?.priority || 'normal' as Task['priority'],
    duration_days: task?.duration_days || 1,
    estimated_cost: task?.estimated_cost || 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">
          {task ? 'Edit Task' : 'Create Task'}
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as Task['type'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="task">Task</option>
                  <option value="milestone">Milestone</option>
                  <option value="summary">Summary</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (days)
                </label>
                <input
                  type="number"
                  value={formData.duration_days}
                  onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Cost
                </label>
                <input
                  type="number"
                  value={formData.estimated_cost}
                  onChange={(e) => setFormData({ ...formData, estimated_cost: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {task ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};