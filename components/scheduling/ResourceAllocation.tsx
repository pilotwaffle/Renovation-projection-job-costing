'use client';

import React, { useState, useMemo } from 'react';
import { format, addDays, differenceInDays, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval } from 'date-fns';
import {
  Users,
  Calendar,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  TrendingUp,
  Activity,
  DollarSign,
  Clock,
  Settings,
  Eye,
  BarChart3,
} from 'lucide-react';

import { Resource, TaskAssignment, Task, ResourceHeatmapData } from '@/types/scheduling';
import { ResourceManager } from '@/lib/scheduling/resourceManager';

interface ResourceAllocationProps {
  resources: Resource[];
  assignments: TaskAssignment[];
  tasks: Task[];
  onResourceCreate?: (resource: Omit<Resource, 'id' | 'created_at' | 'updated_at'>) => void;
  onResourceUpdate?: (resourceId: string, updates: Partial<Resource>) => void;
  onResourceDelete?: (resourceId: string) => void;
  onAssignmentCreate?: (assignment: Omit<TaskAssignment, 'id' | 'created_at' | 'updated_at'>) => void;
  onAssignmentUpdate?: (assignmentId: string, updates: Partial<TaskAssignment>) => void;
  onAssignmentDelete?: (assignmentId: string) => void;
  dateRange?: { start: Date; end: Date };
  className?: string;
}

export const ResourceAllocation: React.FC<ResourceAllocationProps> = ({
  resources,
  assignments,
  tasks,
  onResourceCreate,
  onResourceUpdate,
  onResourceDelete,
  onAssignmentCreate,
  onAssignmentUpdate,
  onAssignmentDelete,
  dateRange = { start: new Date(), end: addDays(new Date(), 30) },
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'heatmap' | 'timeline'>('list');
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Calculate resource utilization summary
  const resourceSummary = useMemo(() => {
    return ResourceManager.getResourceUtilizationSummary(
      resources,
      assignments,
      tasks,
      dateRange.start,
      dateRange.end
    );
  }, [resources, assignments, tasks, dateRange]);

  // Filter resources
  const filteredResources = useMemo(() => {
    return resources.filter(resource => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          resource.name.toLowerCase().includes(search) ||
          resource.description?.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [resources, searchTerm]);

  // Generate heatmap data
  const heatmapData = useMemo(() => {
    return filteredResources.map(resource =>
      ResourceManager.generateResourceHeatmap(resource, assignments, tasks, dateRange.start, dateRange.end)
    );
  }, [filteredResources, assignments, tasks, dateRange]);

  // Get resource type icon
  const getResourceTypeIcon = (type: Resource['type']) => {
    switch (type) {
      case 'person':
        return Users;
      case 'equipment':
        return Settings;
      case 'material':
        return Activity;
      case 'space':
        return BarChart3;
      default:
        return Users;
    }
  };

  // Get utilization color
  const getUtilizationColor = (utilization: number) => {
    if (utilization > 100) return 'text-red-600 bg-red-100';
    if (utilization > 80) return 'text-amber-600 bg-amber-100';
    if (utilization > 50) return 'text-blue-600 bg-blue-100';
    return 'text-green-600 bg-green-100';
  };

  // Handle resource selection
  const handleResourceClick = (resource: Resource) => {
    setSelectedResource(resource);
  };

  // Handle resource edit
  const handleResourceEdit = (resource: Resource) => {
    setEditingResource(resource);
    setShowResourceForm(true);
  };

  // Handle resource save
  const handleResourceSave = (resourceData: Partial<Resource>) => {
    if (editingResource) {
      onResourceUpdate?.(editingResource.id, resourceData);
    } else {
      onResourceCreate?.(resourceData as Omit<Resource, 'id' | 'created_at' | 'updated_at'>);
    }
    setShowResourceForm(false);
    setEditingResource(null);
  };

  // Render list view
  const renderListView = () => (
    <div className="space-y-4">
      {resourceSummary.map(({ resource, utilization, totalCost, conflictCount, availableDays }) => {
        const ResourceIcon = getResourceTypeIcon(resource.type);
        const utilizationColor = getUtilizationColor(utilization);
        const resourceAssignments = assignments.filter(a => a.resource_id === resource.id);

        return (
          <div
            key={resource.id}
            className={`border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
              selectedResource?.id === resource.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => handleResourceClick(resource)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <ResourceIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{resource.name}</h3>
                  <p className="text-sm text-gray-500">
                    {resource.type} • Capacity: {resource.capacity_per_day}/day
                    {resource.cost_per_unit > 0 && ` • $${resource.cost_per_unit}/unit`}
                  </p>
                  {resource.description && (
                    <p className="text-sm text-gray-400 mt-1">{resource.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {/* Utilization */}
                <div className="text-center">
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${utilizationColor}`}>
                    {utilization.toFixed(1)}%
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Utilization</p>
                </div>

                {/* Conflicts */}
                {conflictCount > 0 && (
                  <div className="text-center">
                    <div className="flex items-center text-red-600">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      <span className="text-sm font-medium">{conflictCount}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Conflicts</p>
                  </div>
                )}

                {/* Cost */}
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-900">
                    ${totalCost.toLocaleString()}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Total Cost</p>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResourceEdit(resource);
                    }}
                    className="p-1 text-gray-400 hover:text-blue-600"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onResourceDelete?.(resource.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Progress bar for utilization */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>Utilization</span>
                <span>{utilization.toFixed(1)}% of {resourceAssignments.length} assignments</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    utilization > 100 ? 'bg-red-500' : utilization > 80 ? 'bg-amber-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, utilization)}%` }}
                />
              </div>
            </div>

            {/* Assignment badges */}
            {resourceAssignments.length > 0 && (
              <div className="mt-3 flex items-center flex-wrap gap-1">
                {resourceAssignments.slice(0, 3).map(assignment => {
                  const task = tasks.find(t => t.id === assignment.task_id);
                  return (
                    <span
                      key={assignment.id}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      {task?.name} ({assignment.allocation_percentage}%)
                    </span>
                  );
                })}
                {resourceAssignments.length > 3 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                    +{resourceAssignments.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // Render heatmap view
  const renderHeatmapView = () => {
    const days = eachDayOfInterval(dateRange);
    const maxUtilization = Math.max(...heatmapData.flatMap(data => data.dates.map(d => d.utilization)));

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Resource
              </th>
              {days.map(day => (
                <th
                  key={day.toISOString()}
                  className="px-2 py-2 text-center text-xs font-medium text-gray-700 uppercase tracking-wider"
                  style={{ minWidth: '40px' }}
                >
                  <div>{format(day, 'dd')}</div>
                  <div className="text-gray-500">{format(day, 'EEE')}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {heatmapData.map(data => (
              <tr key={data.resource_id} className="hover:bg-gray-50">
                <td className="px-4 py-2 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                      {getResourceTypeIcon(resources.find(r => r.id === data.resource_id)?.type || 'person')({
                        className: 'h-4 w-4 text-blue-600',
                      })}
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">{data.resource_name}</div>
                    </div>
                  </div>
                </td>
                {data.dates.map((dateData, index) => (
                  <td
                    key={index}
                    className="px-2 py-2 text-center cursor-pointer hover:opacity-80"
                    style={{
                      backgroundColor: dateData.utilization === 0 ? '#f9fafb' :
                        dateData.utilization > 100 ? '#fecaca' :
                        dateData.utilization > 80 ? '#fed7aa' :
                        dateData.utilization > 50 ? '#bfdbfe' :
                        '#bbf7d0',
                    }}
                    title={`${dateData.utilization.toFixed(1)}% utilization • ${dateData.allocated_tasks} tasks • ${dateData.conflicts} conflicts`}
                  >
                    {dateData.utilization > 0 && (
                      <span className="text-xs font-medium text-gray-700">
                        {dateData.utilization.toFixed(0)}%
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Render timeline view
  const renderTimelineView = () => (
    <div className="space-y-4">
      {filteredResources.map(resource => {
        const resourceAssignments = assignments.filter(a => a.resource_id === resource.id);
        const ResourceIcon = getResourceTypeIcon(resource.type);

        return (
          <div key={resource.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <ResourceIcon className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="font-medium text-gray-900">{resource.name}</h3>
              </div>
              <div className="text-sm text-gray-600">
                {resourceAssignments.length} assignments
              </div>
            </div>

            {/* Timeline */}
            <div className="relative h-16 bg-gray-50 rounded">
              {resourceAssignments.map(assignment => {
                const task = tasks.find(t => t.id === assignment.task_id);
                if (!task || !task.planned_start_date || !task.planned_end_date) return null;

                const taskStart = new Date(task.planned_start_date);
                const taskEnd = new Date(task.planned_end_date);
                const totalDays = differenceInDays(dateRange.end, dateRange.start) + 1;
                const startOffset = differenceInDays(taskStart, dateRange.start);
                const duration = differenceInDays(taskEnd, taskStart) + 1;

                const left = (startOffset / totalDays) * 100;
                const width = (duration / totalDays) * 100;

                return (
                  <div
                    key={assignment.id}
                    className="absolute top-2 h-12 bg-blue-500 rounded text-white text-xs p-1 overflow-hidden cursor-pointer hover:bg-blue-600"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      opacity: assignment.allocation_percentage / 100,
                    }}
                    title={`${task.name} (${assignment.allocation_percentage}% allocation)`}
                  >
                    <div className="font-medium truncate">{task.name}</div>
                    <div className="text-xs opacity-90">{assignment.allocation_percentage}%</div>
                  </div>
                );
              })}
            </div>

            {/* Date labels */}
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{format(dateRange.start, 'MMM dd')}</span>
              <span>{format(dateRange.end, 'MMM dd')}</span>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">Resource Allocation</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Users className="h-4 w-4" />
            <span>{resources.length} resources</span>
            <span>•</span>
            <Activity className="h-4 w-4" />
            <span>{assignments.length} assignments</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* View mode selector */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-md p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-sm rounded ${
                viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('heatmap')}
              className={`px-3 py-1 text-sm rounded ${
                viewMode === 'heatmap' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Heatmap
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1 text-sm rounded ${
                viewMode === 'timeline' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Timeline
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search resources..."
              className="pl-8 pr-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Add resource */}
          <button
            onClick={() => {
              setEditingResource(null);
              setShowResourceForm(true);
            }}
            className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="h-3 w-3" />
            <span>Add Resource</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {filteredResources.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No resources found. Add your first resource to get started.
          </div>
        ) : (
          <>
            {viewMode === 'list' && renderListView()}
            {viewMode === 'heatmap' && renderHeatmapView()}
            {viewMode === 'timeline' && renderTimelineView()}
          </>
        )}
      </div>

      {/* Resource form modal */}
      {showResourceForm && (
        <ResourceForm
          resource={editingResource}
          onSave={handleResourceSave}
          onCancel={() => {
            setShowResourceForm(false);
            setEditingResource(null);
          }}
        />
      )}
    </div>
  );
};

// Resource form component
const ResourceForm: React.FC<{
  resource?: Resource | null;
  onSave: (resource: Partial<Resource>) => void;
  onCancel: () => void;
}> = ({ resource, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: resource?.name || '',
    type: resource?.type || 'person' as Resource['type'],
    description: resource?.description || '',
    capacity_per_day: resource?.capacity_per_day || 8,
    cost_per_unit: resource?.cost_per_unit || 0,
    available_from: resource?.available_from || '',
    available_to: resource?.available_to || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">
          {resource ? 'Edit Resource' : 'Create Resource'}
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
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as Resource['type'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="person">Person</option>
                <option value="equipment">Equipment</option>
                <option value="material">Material</option>
                <option value="space">Space</option>
              </select>
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
                  Capacity/Day
                </label>
                <input
                  type="number"
                  value={formData.capacity_per_day}
                  onChange={(e) => setFormData({ ...formData, capacity_per_day: parseInt(e.target.value) || 8 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cost/Unit
                </label>
                <input
                  type="number"
                  value={formData.cost_per_unit}
                  onChange={(e) => setFormData({ ...formData, cost_per_unit: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Available From
                </label>
                <input
                  type="date"
                  value={formData.available_from}
                  onChange={(e) => setFormData({ ...formData, available_from: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Available To
                </label>
                <input
                  type="date"
                  value={formData.available_to}
                  onChange={(e) => setFormData({ ...formData, available_to: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              {resource ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};