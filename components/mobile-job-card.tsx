'use client';

import React from 'react';
import { useSwipeable } from 'react-swipeable';
import { format } from 'date-fns';
import {
  MapPin,
  Clock,
  DollarSign,
  Users,
  Calendar,
  MoreVertical,
  Play,
  Pause,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Job } from '@/types/database';

interface MobileJobCardProps {
  job: Job;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onClick?: () => void;
  onStartTimer?: () => void;
  onStopTimer?: () => void;
  isTimerActive?: boolean;
  className?: string;
  compact?: boolean;
}

export function MobileJobCard({
  job,
  onSwipeLeft,
  onSwipeRight,
  onClick,
  onStartTimer,
  onStopTimer,
  isTimerActive = false,
  className,
  compact = false
}: MobileJobCardProps) {
  const handlers = useSwipeable({
    onSwipedLeft: () => onSwipeLeft?.(),
    onSwipedRight: () => onSwipeRight?.(),
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
    delta: 50, // Minimum swipe distance
  });

  const statusColors = {
    draft: 'bg-gray-100 text-gray-700',
    active: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700',
    on_hold: 'bg-yellow-100 text-yellow-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  return (
    <div
      {...handlers}
      className={cn(
        'bg-white rounded-lg shadow-sm border border-gray-200',
        'touch-manipulation', // Improves touch responsiveness
        'active:scale-[0.98] transition-transform duration-150',
        compact ? 'p-3' : 'p-4',
        className
      )}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {/* Main content area */}
      <div className="flex items-start justify-between mb-3" onClick={onClick}>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate text-lg">
            {job.title}
          </h3>
          <div className="flex items-center mt-1 text-sm text-gray-600">
            <Users size={14} className="mr-1 flex-shrink-0" />
            <span className="truncate">{job.client_name || 'No client'}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className={cn(
            'px-2 py-1 rounded-full text-xs font-medium',
            statusColors[job.status as keyof typeof statusColors]
          )}>
            {job.status.replace('_', ' ')}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Handle menu click
            }}
            className="p-1 hover:bg-gray-100 rounded-md active:bg-gray-200 transition-colors"
          >
            <MoreVertical size={16} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* Quick stats row */}
      {!compact && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="flex items-center text-sm text-gray-600">
            <MapPin size={14} className="mr-1 text-gray-400" />
            <span className="truncate">Address</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Calendar size={14} className="mr-1 text-gray-400" />
            <span className="truncate">{formatDate(job.created_at)}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <DollarSign size={14} className="mr-1 text-gray-400" />
            <span className="truncate">{formatCurrency(job.budget || 0)}</span>
          </div>
        </div>
      )}

      {/* Description (if not compact) */}
      {!compact && job.description && (
        <div className="mb-3">
          <p className="text-sm text-gray-600 line-clamp-2">
            {job.description}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center space-x-2">
          {isTimerActive ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStopTimer?.();
              }}
              className="flex items-center space-x-1 px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium active:bg-red-600 transition-colors"
            >
              <Pause size={14} />
              <span>Stop</span>
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartTimer?.();
              }}
              className="flex items-center space-x-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium active:bg-green-600 transition-colors"
            >
              <Play size={14} />
              <span>Start</span>
            </button>
          )}
        </div>

        <div className="flex items-center text-sm text-gray-500">
          <ChevronRight size={16} />
        </div>
      </div>

      {/* Swipe indicators */}
      {(onSwipeLeft || onSwipeRight) && (
        <div className="absolute top-0 left-0 bottom-0 flex items-center pointer-events-none">
          {onSwipeLeft && (
            <div className="bg-blue-500 text-white px-2 py-1 rounded-r-md text-xs font-medium opacity-0 transition-opacity duration-200">
              Swipe to edit
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface MobileJobListProps {
  jobs: Job[];
  loading?: boolean;
  onJobClick?: (job: Job) => void;
  onJobSwipeLeft?: (job: Job) => void;
  onJobSwipeRight?: (job: Job) => void;
  onStartTimer?: (job: Job) => void;
  onStopTimer?: (job: Job) => void;
  activeTimerJob?: string;
  compact?: boolean;
}

export function MobileJobList({
  jobs,
  loading = false,
  onJobClick,
  onJobSwipeLeft,
  onJobSwipeRight,
  onStartTimer,
  onStopTimer,
  activeTimerJob,
  compact = false
}: MobileJobListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
            <div className="grid grid-cols-3 gap-2">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="bg-gray-100 rounded-full p-4 mb-4">
          <Briefcase size={32} className="text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No jobs found</h3>
        <p className="text-sm text-gray-600 text-center">
          Create your first job to get started with tracking your renovation projects.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <MobileJobCard
          key={job.id}
          job={job}
          onClick={() => onJobClick?.(job)}
          onSwipeLeft={() => onJobSwipeLeft?.(job)}
          onSwipeRight={() => onJobSwipeRight?.(job)}
          onStartTimer={() => onStartTimer?.(job)}
          onStopTimer={() => onStopTimer?.(job)}
          isTimerActive={activeTimerJob === job.id}
          compact={compact}
        />
      ))}
    </div>
  );
}

import { Briefcase } from 'lucide-react';