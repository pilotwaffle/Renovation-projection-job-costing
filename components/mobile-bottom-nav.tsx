'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Briefcase,
  Clock,
  Plus,
  Settings,
  MapPin,
  Users,
  BarChart3,
  Brain
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: number;
  action?: () => void;
}

interface BottomNavProps {
  className?: string;
}

export function MobileBottomNav({ className }: BottomNavProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: Home,
    },
    {
      href: '/jobs',
      label: 'Jobs',
      icon: Briefcase,
    },
    {
      href: '/time-tracking',
      label: 'Time',
      icon: Clock,
    },
    {
      href: '/ai/predict',
      label: 'AI',
      icon: Brain,
    },
    {
      href: '/analytics',
      label: 'Analytics',
      icon: BarChart3,
    },
  ];

  return (
    <nav className={cn(
      'fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-2 py-2 md:hidden',
      className
    )}>
      <div className="flex justify-around items-center">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href === '/ai/predict' && pathname.startsWith('/ai/'));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={item.action}
              className={cn(
                'flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors duration-200 min-w-0 flex-1',
                'touch-manipulation', // Improves touch responsiveness
                isActive
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              )}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <div className="relative">
                <Icon
                  size={20}
                  className={cn(
                    'transition-transform duration-200',
                    isActive && 'scale-110'
                  )}
                />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1 truncate max-w-full">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Safe area padding for notched screens */}
      <div className="h-safe-area-inset-bottom"></div>
    </nav>
  );
}

interface FloatingActionButtonProps {
  onClick: () => void;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label?: string;
  position?: 'bottom-right' | 'bottom-left' | 'center-bottom';
  className?: string;
}

export function FloatingActionButton({
  onClick,
  icon: Icon,
  label,
  position = 'bottom-right',
  className
}: FloatingActionButtonProps) {
  const positionClasses = {
    'bottom-right': 'bottom-20 right-4',
    'bottom-left': 'bottom-20 left-4',
    'center-bottom': 'bottom-20 left-1/2 -translate-x-1/2',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed z-50 bg-blue-600 text-white rounded-full shadow-lg',
        'touch-manipulation', // Improves touch responsiveness
        'hover:bg-blue-700 active:bg-blue-800 active:scale-95',
        'transition-all duration-200',
        'flex items-center justify-center',
        positionClasses[position],
        'w-14 h-14 md:w-16 md:h-16',
        className
      )}
      style={{ WebkitTapHighlightColor: 'transparent' }}
      aria-label={label}
    >
      <Icon size={24} />
      {label && (
        <span className="absolute -top-8 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          {label}
        </span>
      )}
    </button>
  );
}

interface QuickActionProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  onClick: () => void;
  color?: string;
  disabled?: boolean;
}

export function QuickAction({
  icon: Icon,
  label,
  onClick,
  color = 'blue',
  disabled = false
}: QuickActionProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 hover:bg-blue-200',
    green: 'bg-green-100 text-green-600 hover:bg-green-200',
    red: 'bg-red-100 text-red-600 hover:bg-red-200',
    yellow: 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200',
    purple: 'bg-purple-100 text-purple-600 hover:bg-purple-200',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center p-3 rounded-lg transition-all duration-200',
        'touch-manipulation',
        colorClasses[color as keyof typeof colorClasses],
        disabled && 'opacity-50 cursor-not-allowed',
        'active:scale-95'
      )}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <Icon size={24} />
      <span className="text-xs mt-1 text-center">{label}</span>
    </button>
  );
}