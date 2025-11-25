'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { format, addDays, differenceInDays, startOfDay, endOfDay, isSameDay, isWithinInterval, startOfWeek, endOfWeek } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Calendar,
  Clock,
  Users,
  MapPin,
  Filter,
  Search,
  Download,
  Grid3x3,
  List,
  Sun,
  Moon,
  Coffee,
} from 'lucide-react';

import { Task, TimelineView } from '@/types/scheduling';

interface TimelineProps {
  tasks: Task[];
  startDate: Date;
  endDate: Date;
  onTaskSelect?: (task: Task) => void;
  onDateRangeChange?: (start: Date, end: Date) => void;
  showWeekends?: boolean;
  showWorkingHours?: boolean;
  scale?: 'day' | 'week' | 'month';
  className?: string;
}

interface TimelineTask {
  id: string;
  task: Task;
  left: number;
  width: number;
  top: number;
  height: number;
  lane: number;
}

export const Timeline: React.FC<TimelineProps> = ({
  tasks,
  startDate,
  endDate,
  onTaskSelect,
  onDateRangeChange,
  showWeekends = true,
  showWorkingHours = false,
  scale = 'day',
  className = '',
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewScale, setViewScale] = useState(scale);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [hoveredTask, setHoveredTask] = useState<Task | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Calculate timeline dimensions
  const totalDays = differenceInDays(endDate, startDate) + 1;
  const pixelsPerDay = viewScale === 'day' ? 60 : viewScale === 'week' ? 20 : 10;
  const timelineWidth = totalDays * pixelsPerDay;
  const timelineHeight = 400;
  const headerHeight = 60;
  const laneHeight = 40;
  const taskPadding = 2;

  // Filter tasks
  const filteredTasks = React.useMemo(() => {
    return tasks.filter(task => {
      if (!task.planned_start_date || !task.planned_end_date) return false;

      const taskStart = new Date(task.planned_start_date);
      const taskEnd = new Date(task.planned_end_date);

      // Check if task overlaps with timeline range
      if (taskEnd < startDate || taskStart > endDate) return false;

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return task.name.toLowerCase().includes(search) ||
               task.description?.toLowerCase().includes(search);
      }

      return true;
    });
  }, [tasks, startDate, endDate, searchTerm]);

  // Calculate task lanes to avoid overlaps
  const calculateLanes = useCallback((tasks: Task[]): TimelineTask[] => {
    const lanes: number[] = [];
    const timelineTasks: TimelineTask[] = [];

    tasks.forEach(task => {
      if (!task.planned_start_date || !task.planned_end_date) return;

      const taskStart = new Date(task.planned_start_date);
      const taskEnd = new Date(task.planned_end_date);
      const taskLeft = differenceInDays(taskStart, startDate) * pixelsPerDay;
      const taskWidth = (differenceInDays(taskEnd, taskStart) + 1) * pixelsPerDay;

      // Find available lane
      let laneIndex = 0;
      for (let i = 0; i < lanes.length; i++) {
        const laneEnd = lanes[i];
        if (taskLeft >= laneEnd) {
          laneIndex = i;
          break;
        }
        if (i === lanes.length - 1) {
          laneIndex = lanes.length;
        }
      }

      // Update lane end
      lanes[laneIndex] = taskLeft + taskWidth;

      timelineTasks.push({
        id: task.id,
        task,
        left: taskLeft,
        width: taskWidth,
        top: headerHeight + (laneIndex * (laneHeight + taskPadding)) + taskPadding,
        height: laneHeight - taskPadding * 2,
        lane: laneIndex,
      });
    });

    return timelineTasks;
  }, [startDate, pixelsPerDay]);

  const timelineTasks = calculateLanes(filteredTasks);

  // Get color for task based on status
  const getTaskColor = (task: Task) => {
    switch (task.status) {
      case 'completed':
        return '#10b981'; // green-500
      case 'in_progress':
        return '#3b82f6'; // blue-500
      case 'not_started':
        return '#94a3b8'; // slate-500
      case 'delayed':
        return '#f59e0b'; // amber-500
      case 'blocked':
        return '#ef4444'; // red-500
      default:
        return '#94a3b8';
    }
  };

  // Handle navigation
  const navigatePrevious = () => {
    const daysToMove = viewScale === 'day' ? 7 : viewScale === 'week' ? 4 : 1;
    onDateRangeChange?.(
      addDays(startDate, -daysToMove),
      addDays(endDate, -daysToMove)
    );
  };

  const navigateNext = () => {
    const daysToMove = viewScale === 'day' ? 7 : viewScale === 'week' ? 4 : 1;
    onDateRangeChange?.(
      addDays(startDate, daysToMove),
      addDays(endDate, daysToMove)
    );
  };

  const navigateToday = () => {
    const today = new Date();
    const daysToShow = viewScale === 'day' ? 14 : viewScale === 'week' ? 8 : 2;
    onDateRangeChange?.(
      startOfWeek(today, { weekStartsOn: 1 }),
      addDays(startOfWeek(today, { weekStartsOn: 1 }), daysToShow - 1)
    );
  };

  // Handle zoom
  const handleZoomIn = () => {
    if (viewScale === 'month') setViewScale('week');
    else if (viewScale === 'week') setViewScale('day');
  };

  const handleZoomOut = () => {
    if (viewScale === 'day') setViewScale('week');
    else if (viewScale === 'week') setViewScale('month');
  };

  // Handle date click
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  // Handle task click
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    onTaskSelect?.(task);
  };

  // Check if date is weekend
  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  // Check if date is working day
  const isWorkingDay = (date: Date) => {
    return !isWeekend(date);
  };

  // Generate time markers
  const generateTimeMarkers = () => {
    const markers = [];
    const currentDate = new Date(startDate);

    for (let i = 0; i < totalDays; i++) {
      const currentDay = new Date(currentDate);
      const isCurrentDate = isSameDay(currentDay, new Date());
      const isSelectedDate = isSameDay(currentDay, selectedDate);
      const isWeekendDate = isWeekend(currentDay);

      markers.push({
        date: currentDay,
        left: i * pixelsPerDay,
        width: pixelsPerDay,
        isCurrentDate,
        isSelectedDate,
        isWeekendDate,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return markers;
  };

  const timeMarkers = generateTimeMarkers();

  // Generate current time line
  const getCurrentTimeLine = () => {
    if (!isWithinInterval(currentTime, { start: startDate, end: endDate })) {
      return null;
    }

    const minutesSinceStart = differenceInDays(currentTime, startDate) * 24 * 60 +
      currentTime.getHours() * 60 + currentTime.getMinutes();
    const totalMinutes = totalDays * 24 * 60;
    const leftPosition = (minutesSinceStart / totalMinutes) * timelineWidth;

    return (
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
        style={{ left: `${leftPosition}px` }}
      >
        <div className="absolute -top-1 -left-1 w-3 h-3 bg-red-500 rounded-full" />
        <div className="absolute top-4 left-2 bg-red-500 text-white text-xs px-1 py-0.5 rounded whitespace-nowrap">
          {format(currentTime, 'HH:mm')}
        </div>
      </div>
    );
  };

  // Export timeline data
  const handleExport = () => {
    const exportData = {
      tasks: filteredTasks.map(task => ({
        name: task.name,
        start: task.planned_start_date,
        end: task.planned_end_date,
        status: task.status,
        progress: task.progress_percentage,
      })),
      timelineRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timeline-${format(startDate, 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">Project Timeline</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>{format(startDate, 'MMM dd')} - {format(endDate, 'MMM dd, yyyy')}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Navigation */}
          <div className="flex items-center space-x-1">
            <button
              onClick={navigatePrevious}
              className="p-1 hover:bg-gray-100 rounded"
              title="Previous period"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={navigateToday}
              className="px-2 py-1 text-sm hover:bg-gray-100 rounded"
              title="Go to today"
            >
              Today
            </button>
            <button
              onClick={navigateNext}
              className="p-1 hover:bg-gray-100 rounded"
              title="Next period"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center space-x-1">
            <button
              onClick={handleZoomOut}
              className="p-1 hover:bg-gray-100 rounded"
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium capitalize px-2">
              {viewScale}
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1 hover:bg-gray-100 rounded"
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

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

          {/* Export */}
          <button
            onClick={handleExport}
            className="p-1 hover:bg-gray-100 rounded"
            title="Export timeline"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="overflow-auto" style={{ maxHeight: '500px' }} ref={timelineRef}>
        <div
          className="relative"
          style={{
            width: `${timelineWidth}px`,
            height: `${timelineHeight}px`,
            minWidth: '800px',
          }}
        >
          {/* Background grid */}
          <div className="absolute inset-0">
            {timeMarkers.map((marker, index) => (
              <div
                key={index}
                className={`absolute top-0 bottom-0 border-r ${
                  marker.isWeekendDate && !showWeekends
                    ? 'bg-gray-100'
                    : marker.isCurrentDate
                    ? 'bg-blue-50'
                    : marker.isSelectedDate
                    ? 'bg-yellow-50'
                    : 'bg-white'
                }`}
                style={{
                  left: `${marker.left}px`,
                  width: `${marker.width}px`,
                }}
              >
                {/* Date label */}
                <div className="absolute top-0 left-0 right-0 text-center text-xs font-medium text-gray-700 bg-white border-b border-gray-200">
                  {viewScale === 'day' && format(marker.date, 'EEE dd')}
                  {viewScale === 'week' && format(marker.date, 'dd')}
                  {viewScale === 'month' && format(marker.date, 'd')}
                </div>
              </div>
            ))}
          </div>

          {/* Current time line */}
          {getCurrentTimeLine()}

          {/* Tasks */}
          {timelineTasks.map((timelineTask) => (
            <div
              key={timelineTask.id}
              className={`absolute rounded cursor-pointer transition-all hover:shadow-lg ${
                selectedTask?.id === timelineTask.task.id ? 'ring-2 ring-blue-500' : ''
              } ${hoveredTask?.id === timelineTask.task.id ? 'opacity-80' : ''}`}
              style={{
                left: `${timelineTask.left}px`,
                top: `${timelineTask.top}px`,
                width: `${Math.max(60, timelineTask.width)}px`,
                height: `${timelineTask.height}px`,
                backgroundColor: getTaskColor(timelineTask.task),
              }}
              onClick={() => handleTaskClick(timelineTask.task)}
              onMouseEnter={() => setHoveredTask(timelineTask.task)}
              onMouseLeave={() => setHoveredTask(null)}
            >
              {/* Progress bar */}
              <div
                className="absolute top-0 left-0 h-full bg-white opacity-30 rounded"
                style={{ width: `${timelineTask.task.progress_percentage}%` }}
              />

              {/* Task content */}
              <div className="absolute inset-0 flex items-center px-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white truncate">
                    {timelineTask.task.name}
                  </div>
                  {timelineTask.task.progress_percentage > 0 && (
                    <div className="text-xs text-white opacity-90">
                      {timelineTask.task.progress_percentage}%
                    </div>
                  )}
                </div>
              </div>

              {/* Task tooltip */}
              {hoveredTask?.id === timelineTask.task.id && (
                <div className="absolute bottom-full left-0 mb-2 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-30 whitespace-nowrap">
                  <div className="font-medium">{timelineTask.task.name}</div>
                  <div className="text-gray-300">
                    {format(new Date(timelineTask.task.planned_start_date!), 'MMM dd, yyyy')} -
                    {format(new Date(timelineTask.task.planned_end_date!), 'MMM dd, yyyy')}
                  </div>
                  <div className="text-gray-300">
                    Status: {timelineTask.task.status.replace('_', ' ')}
                  </div>
                  <div className="absolute bottom-0 left-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
                </div>
              )}
            </div>
          ))}

          {/* Task details panel */}
          {selectedTask && (
            <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 shadow-lg">
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
                    Progress: {selectedTask.progress_percentage}%
                  </div>
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
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between p-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-gray-600">Completed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-gray-600">In Progress</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-slate-500 rounded"></div>
            <span className="text-gray-600">Not Started</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-amber-500 rounded"></div>
            <span className="text-gray-600">Delayed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-gray-600">Blocked</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>{filteredTasks.length} tasks</span>
          <span>•</span>
          <span>{totalDays} days</span>
        </div>
      </div>
    </div>
  );
};