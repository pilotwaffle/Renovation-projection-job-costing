'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format, differenceInDays, addDays, isSameDay, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Filter,
  Search,
  Calendar,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Play,
  Pause,
  Square,
  Flag,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react';

import { GanttTask, GanttResource, GanttViewMode, GanttDateRange, Task } from '@/types/scheduling';
import { GanttChartProcessor } from '@/lib/scheduling/ganttChart';

interface GanttChartProps {
  tasks: GanttTask[];
  resources?: GanttResource[];
  viewMode: GanttViewMode;
  dateRange: GanttDateRange;
  onTaskSelect?: (task: GanttTask) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<GanttTask>) => void;
  onDateRangeChange?: (range: GanttDateRange) => void;
  onViewModeChange?: (mode: GanttViewMode) => void;
  filters?: {
    status?: string[];
    priority?: string[];
    assignee?: string[];
    searchText?: string;
  };
  className?: string;
}

export const GanttChart: React.FC<GanttChartProps> = ({
  tasks,
  resources = [],
  viewMode,
  dateRange,
  onTaskSelect,
  onTaskUpdate,
  onDateRangeChange,
  onViewModeChange,
  filters,
  className = '',
}) => {
  const [selectedTask, setSelectedTask] = useState<GanttTask | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedTask, setDraggedTask] = useState<GanttTask | null>(null);
  const [hoveredTask, setHoveredTask] = useState<GanttTask | null>(null);

  const chartRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Generate timeline data
  const { timeline, headerRows } = GanttChartProcessor.generateTimelineData(
    dateRange.start,
    dateRange.end,
    viewMode
  );

  // Filter tasks
  const filteredTasks = React.useMemo(() => {
    return GanttChartProcessor.filterTasks(tasks, {
      ...filters,
      searchText: searchTerm,
    });
  }, [tasks, filters, searchTerm]);

  // Calculate grid dimensions
  const totalDays = differenceInDays(dateRange.end, dateRange.start) + 1;
  const gridWidth = totalDays * (viewMode.mode === 'day' ? 40 : viewMode.mode === 'week' ? 120 : 150);
  const rowHeight = 32;
  const headerHeight = headerRows.length * 40;

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

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'in_progress':
        return <Play className="h-3 w-3 text-blue-500" />;
      case 'not_started':
        return <Square className="h-3 w-3 text-gray-400" />;
      case 'delayed':
        return <AlertTriangle className="h-3 w-3 text-amber-500" />;
      case 'blocked':
        return <Pause className="h-3 w-3 text-red-500" />;
      default:
        return <Clock className="h-3 w-3 text-gray-400" />;
    }
  };

  // Get priority icon
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <Flag className="h-3 w-3 text-red-500" />;
      case 'high':
        return <Flag className="h-3 w-3 text-amber-500" />;
      case 'normal':
        return <Flag className="h-3 w-3 text-blue-500" />;
      case 'low':
        return <Flag className="h-3 w-3 text-green-500" />;
      default:
        return null;
    }
  };

  // Handle task selection
  const handleTaskClick = (task: GanttTask) => {
    setSelectedTask(task);
    onTaskSelect?.(task);
  };

  // Handle drag start
  const handleDragStart = (task: GanttTask) => {
    setIsDragging(true);
    setDraggedTask(task);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    if (!draggedTask || !onTaskUpdate) return;

    const taskDuration = differenceInDays(draggedTask.end, draggedTask.start);
    const newStartDate = targetDate;
    const newEndDate = addDays(newStartDate, taskDuration);

    onTaskUpdate(draggedTask.id, {
      start: newStartDate,
      end: newEndDate,
    });

    setIsDragging(false);
    setDraggedTask(null);
  };

  // Handle zoom
  const handleZoomIn = () => {
    const modes: GanttViewMode['mode'][] = ['day', 'week', 'month', 'quarter'];
    const currentIndex = modes.indexOf(viewMode.mode);
    if (currentIndex < modes.length - 1) {
      onViewModeChange?.({ mode: modes[currentIndex + 1], step: 1 });
    }
  };

  const handleZoomOut = () => {
    const modes: GanttViewMode['mode'][] = ['day', 'week', 'month', 'quarter'];
    const currentIndex = modes.indexOf(viewMode.mode);
    if (currentIndex > 0) {
      onViewModeChange?.({ mode: modes[currentIndex - 1], step: 1 });
    }
  };

  // Handle navigation
  const navigatePrevious = () => {
    const daysToMove = Math.min(30, totalDays);
    onDateRangeChange?.({
      start: addDays(dateRange.start, -daysToMove),
      end: addDays(dateRange.end, -daysToMove),
    });
  };

  const navigateNext = () => {
    const daysToMove = Math.min(30, totalDays);
    onDateRangeChange?.({
      start: addDays(dateRange.start, daysToMove),
      end: addDays(dateRange.end, daysToMove),
    });
  };

  // Handle export
  const handleExport = (format: 'json' | 'csv' | 'ical') => {
    const data = GanttChartProcessor.exportGanttData(tasks, format);
    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gantt-chart.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Render task row
  const renderTaskRow = (task: GanttTask, level: number = 0): React.ReactNode => {
    const isExpanded = expandedTasks.has(task.id);
    const hasChildren = task.children && task.children.length > 0;
    const taskWidth = differenceInDays(task.end, task.start) * (gridWidth / totalDays);
    const taskLeft = differenceInDays(task.start, dateRange.start) * (gridWidth / totalDays);
    const isSelected = selectedTask?.id === task.id;
    const isHovered = hoveredTask?.id === task.id;

    return (
      <div key={task.id} className="flex">
        {/* Task info column */}
        <div
          className="flex items-center px-2 border-r border-gray-200 bg-white"
          style={{ width: '300px', height: `${rowHeight}px` }}
        >
          <div className="flex items-center flex-1">
            <div className="w-4 h-4 flex items-center justify-center mr-1">
              {hasChildren && (
                <button
                  onClick={() => toggleTaskExpansion(task.id)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRightIcon className="h-3 w-3" />
                  )}
                </button>
              )}
            </div>
            <div className="w-4 h-4 mr-1">
              {getStatusIcon(task.status)}
            </div>
            <div className="w-4 h-4 mr-1">
              {getPriorityIcon(task.priority)}
            </div>
            <div
              className={`text-sm truncate cursor-pointer hover:text-blue-600 ${
                isSelected ? 'font-semibold text-blue-600' : ''
              }`}
              style={{ paddingLeft: `${level * 16}px` }}
              onClick={() => handleTaskClick(task)}
            >
              {task.name}
            </div>
          </div>
        </div>

        {/* Gantt chart area */}
        <div
          className="relative border-r border-gray-200 hover:bg-gray-50"
          style={{ width: `${gridWidth}px`, height: `${rowHeight}px` }}
          onMouseEnter={() => setHoveredTask(task)}
          onMouseLeave={() => setHoveredTask(null)}
          onDragOver={handleDragOver}
          onDrop={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const daysFromStart = Math.floor((x / gridWidth) * totalDays);
            const dropDate = addDays(dateRange.start, daysFromStart);
            handleDrop(e, dropDate);
          }}
        >
          {/* Task bar */}
          <div
            className={`absolute top-1 h-7 rounded cursor-move transition-all ${
              isSelected ? 'ring-2 ring-blue-500' : ''
            } ${isHovered ? 'opacity-80' : ''}`}
            style={{
              left: `${taskLeft}px`,
              width: `${Math.max(2, taskWidth)}px`,
              backgroundColor: task.color || '#3b82f6',
            }}
            draggable={task.movable}
            onDragStart={() => handleDragStart(task)}
            onClick={() => handleTaskClick(task)}
          >
            {/* Progress bar */}
            <div
              className="absolute top-0 left-0 h-full bg-green-500 rounded opacity-30"
              style={{ width: `${task.progress}%` }}
            />

            {/* Task name overlay */}
            <div className="absolute inset-0 flex items-center px-2">
              <span className="text-xs text-white font-medium truncate">
                {task.name}
              </span>
            </div>
          </div>

          {/* Dependencies lines would go here - simplified for now */}
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header controls */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <button
            onClick={navigatePrevious}
            className="p-1 hover:bg-gray-100 rounded"
            title="Previous period"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={navigateNext}
            className="p-1 hover:bg-gray-100 rounded"
            title="Next period"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="text-sm font-medium text-gray-700">
            {format(dateRange.start, 'MMM dd, yyyy')} - {format(dateRange.end, 'MMM dd, yyyy')}
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

          {/* View mode */}
          <div className="flex items-center space-x-1">
            <button
              onClick={handleZoomOut}
              className="p-1 hover:bg-gray-100 rounded"
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium capitalize px-2">
              {viewMode.mode}
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1 hover:bg-gray-100 rounded"
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-1 hover:bg-gray-100 rounded"
              title="Filters"
            >
              <Filter className="h-4 w-4" />
            </button>
            <div className="relative group">
              <button className="p-1 hover:bg-gray-100 rounded" title="Export">
                <Download className="h-4 w-4" />
              </button>
              <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={() => handleExport('json')}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                >
                  Export as JSON
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                >
                  Export as CSV
                </button>
                <button
                  onClick={() => handleExport('ical')}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                >
                  Export as iCalendar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gantt chart */}
      <div className="overflow-auto" style={{ maxHeight: '600px' }} ref={chartRef}>
        <div style={{ minWidth: `${300 + gridWidth}px` }}>
          {/* Header */}
          <div className="flex">
            <div style={{ width: '300px' }} className="border-b border-gray-200" />
            <div className="relative" style={{ width: `${gridWidth}px` }}>
              {headerRows.map((row, rowIndex) => (
                <div
                  key={rowIndex}
                  className="absolute top-0 flex border-b border-gray-200"
                  style={{
                    height: `${row.width}px`,
                    width: `${gridWidth}px`,
                    top: `${rowIndex * row.width}px`,
                  }}
                >
                  {row.dates.map((date, dateIndex) => (
                    <div
                      key={dateIndex}
                      className="flex-1 text-center text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 flex items-center justify-center"
                      style={{ minWidth: `${gridWidth / row.dates.length}px` }}
                    >
                      {format(date, rowIndex === 0 ? 'MMM dd' : 'dd')}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Task rows */}
          <div ref={gridRef}>
            {filteredTasks.map(task => renderTaskRow(task))}
          </div>
        </div>
      </div>

      {/* Task details panel (shown when task is selected) */}
      {selectedTask && (
        <div className="border-t border-gray-200 p-3 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h3 className="font-medium text-gray-900">{selectedTask.name}</h3>
                <p className="text-sm text-gray-500">
                  {format(selectedTask.start, 'MMM dd, yyyy')} - {format(selectedTask.end, 'MMM dd, yyyy')}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center">
                  {getStatusIcon(selectedTask.status)}
                  <span className="text-sm text-gray-600 ml-1 capitalize">{selectedTask.status}</span>
                </div>
                <div className="flex items-center">
                  {getPriorityIcon(selectedTask.priority)}
                  <span className="text-sm text-gray-600 ml-1 capitalize">{selectedTask.priority}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-sm text-gray-600">
                Progress: {selectedTask.progress}%
              </div>
              {selectedTask.assignee && (
                <div className="text-sm text-gray-600 flex items-center">
                  <Users className="h-3 w-3 mr-1" />
                  {selectedTask.assignee}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};