'use client';

import React, { useState, useEffect } from 'react';
import { usePWA } from '@/hooks/use-pwa';
import { useLocationTracking } from '@/hooks/use-location-tracking';
import { MobileBottomNav, FloatingActionButton, QuickAction } from './mobile-bottom-nav';
import {
  Briefcase,
  Clock,
  Users,
  BarChart3,
  Plus,
  Play,
  MapPin,
  Wifi,
  WifiOff,
  Sync,
  Settings,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickStat {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

interface RecentJob {
  id: string;
  title: string;
  client: string;
  status: string;
  budget?: number;
  lastActivity: string;
  hasActiveTimer: boolean;
}

export default function MobileDashboard() {
  const { state: pwaState, storageInfo } = usePWA();
  const { state: locationState } = useLocationTracking();
  const [stats, setStats] = useState<QuickStat[]>([]);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [showConnectionBanner, setShowConnectionBanner] = useState(false);

  // Mock data - replace with actual API calls
  useEffect(() => {
    const loadDashboardData = async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      setStats([
        {
          label: 'Active Jobs',
          value: 12,
          icon: Briefcase,
          color: 'blue',
          trend: { value: 8, isPositive: true }
        },
        {
          label: 'Hours This Week',
          value: 34.5,
          icon: Clock,
          color: 'green',
          trend: { value: 12, isPositive: true }
        },
        {
          label: 'Total Clients',
          value: 28,
          icon: Users,
          color: 'purple',
          trend: { value: 3, isPositive: true }
        },
        {
          label: 'Monthly Revenue',
          value: '$45,678',
          icon: BarChart3,
          color: 'yellow',
          trend: { value: 15, isPositive: true }
        }
      ]);

      setRecentJobs([
        {
          id: '1',
          title: 'Kitchen Renovation',
          client: 'Smith Family',
          status: 'active',
          budget: 25000,
          lastActivity: '2 hours ago',
          hasActiveTimer: false
        },
        {
          id: '2',
          title: 'Bathroom Update',
          client: 'Johnson Residence',
          status: 'active',
          budget: 8500,
          lastActivity: '1 day ago',
          hasActiveTimer: true
        },
        {
          id: '3',
          title: 'Basement Finishing',
          client: 'Davis Properties',
          status: 'completed',
          budget: 35000,
          lastActivity: '3 days ago',
          hasActiveTimer: false
        }
      ]);
    };

    loadDashboardData();
  }, []);

  // Connection banner logic
  useEffect(() => {
    if (!pwaState.isOnline) {
      setShowConnectionBanner(true);
    }
  }, [pwaState.isOnline]);

  const handleQuickAction = (action: string) => {
    console.log(`Quick action: ${action}`);
    // Handle different quick actions
  };

  const handleCreateJob = () => {
    console.log('Create new job');
    // Navigate to job creation
  };

  const handleSync = async () => {
    console.log('Manual sync triggered');
    // Trigger manual sync
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Connection Status Banner */}
      {showConnectionBanner && (
        <div className={cn(
          'fixed top-0 left-0 right-0 z-40 px-4 py-3 text-sm font-medium transition-all duration-300',
          pwaState.isOnline
            ? 'bg-green-500 text-white'
            : 'bg-orange-500 text-white'
        )}>
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {pwaState.isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
              <span>
                {pwaState.isOnline ? 'Back online' : 'You\'re offline - showing cached data'}
              </span>
            </div>
            {pwaState.isOnline && (
              <button
                onClick={() => setShowConnectionBanner(false)}
                className="text-white hover:text-gray-200"
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={cn(
        'max-w-md mx-auto px-4 py-6 transition-all duration-300',
        showConnectionBanner ? 'pt-20' : 'pt-6'
      )}>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-600">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <button
              onClick={handleSync}
              className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 active:bg-gray-50 transition-colors"
              disabled={pwaState.syncInProgress}
            >
              <Sync
                size={18}
                className={cn(
                  'text-gray-600',
                  pwaState.syncInProgress && 'animate-spin'
                )}
              />
            </button>
          </div>

          {/* Status Indicators */}
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <div className={cn(
                'w-2 h-2 rounded-full',
                pwaState.isOnline ? 'bg-green-500' : 'bg-orange-500'
              )} />
              <span>{pwaState.isOnline ? 'Online' : 'Offline'}</span>
            </div>
            {pwaState.pendingSyncCount > 0 && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                <span>{pwaState.pendingSyncCount} pending sync</span>
              </div>
            )}
            {locationState.locationTrackingActive && (
              <div className="flex items-center space-x-1">
                <MapPin size={12} className="text-green-500" />
                <span>Tracking location</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 active:scale-[0.98] transition-transform"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className={cn(
                    'p-2 rounded-lg',
                    stat.color === 'blue' && 'bg-blue-100',
                    stat.color === 'green' && 'bg-green-100',
                    stat.color === 'purple' && 'bg-purple-100',
                    stat.color === 'yellow' && 'bg-yellow-100'
                  )}>
                    <Icon size={16} className={cn(
                      stat.color === 'blue' && 'text-blue-600',
                      stat.color === 'green' && 'text-green-600',
                      stat.color === 'purple' && 'text-purple-600',
                      stat.color === 'yellow' && 'text-yellow-600'
                    )} />
                  </div>
                  {stat.trend && (
                    <div className={cn(
                      'flex items-center text-xs font-medium',
                      stat.trend.isPositive ? 'text-green-600' : 'text-red-600'
                    )}>
                      <TrendingUp size={12} className="mr-1" />
                      {stat.trend.value}%
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {stat.value}
                </div>
                <div className="text-xs text-gray-600">
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-4 gap-3">
            <QuickAction
              icon={Plus}
              label="New Job"
              color="blue"
              onClick={() => handleQuickAction('new-job')}
            />
            <QuickAction
              icon={Clock}
              label="Timer"
              color="green"
              onClick={() => handleQuickAction('timer')}
            />
            <QuickAction
              icon={Users}
              label="Clients"
              color="purple"
              onClick={() => handleQuickAction('clients')}
            />
            <QuickAction
              icon={BarChart3}
              label="Reports"
              color="yellow"
              onClick={() => handleQuickAction('reports')}
            />
          </div>
        </div>

        {/* Recent Jobs */}
        <div className="mb-20">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Recent Jobs</h2>
            <button className="text-sm text-blue-600 font-medium">
              View All
            </button>
          </div>

          <div className="space-y-3">
            {recentJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 active:scale-[0.98] transition-transform"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {job.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {job.client}
                    </p>
                    <div className="flex items-center space-x-3 text-xs text-gray-500">
                      <span className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        job.status === 'active' && 'bg-green-100 text-green-700',
                        job.status === 'completed' && 'bg-blue-100 text-blue-700'
                      )}>
                        {job.status}
                      </span>
                      <span>{job.lastActivity}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    {job.budget && (
                      <div className="text-sm font-semibold text-gray-900 mb-2">
                        ${job.budget.toLocaleString()}
                      </div>
                    )}
                    {job.hasActiveTimer && (
                      <button className="flex items-center space-x-1 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium">
                        <Play size={12} />
                        <span>Active</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Floating Action Button */}
      <FloatingActionButton
        onClick={handleCreateJob}
        icon={Plus}
        label="Create New Job"
      />
    </div>
  );
}