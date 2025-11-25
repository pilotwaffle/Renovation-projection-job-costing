'use client';

import React, { useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { cn } from '@/lib/utils';

interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ComponentType<{ size?: number; className?: string }>;
  rightIcon?: React.ComponentType<{ size?: number; className?: string }>;
  onRightIconClick?: () => void;
}

export const MobileInput = forwardRef<HTMLInputElement, MobileInputProps>(
  ({ className, label, error, helperText, leftIcon: LeftIcon, rightIcon: RightIcon, onRightIconClick, ...props }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => inputRef.current!);

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          {LeftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LeftIcon size={18} className="text-gray-400" />
            </div>
          )}
          <input
            ref={inputRef}
            className={cn(
              'block w-full rounded-lg border border-gray-300 px-3 py-3 text-base',
              'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              'placeholder-gray-400',
              'transition-all duration-200',
              LeftIcon && 'pl-10',
              RightIcon && 'pr-10',
              error && 'border-red-300 focus:ring-red-500 focus:border-red-500',
              'disabled:bg-gray-100 disabled:cursor-not-allowed',
              // Touch-friendly styles
              'touch-manipulation',
              'text-gray-900',
              className
            )}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            {...props}
          />
          {RightIcon && (
            <button
              type="button"
              onClick={onRightIconClick}
              className="absolute inset-y-0 right-0 pr-3 flex items-center active:bg-gray-100 rounded-r-lg"
            >
              <RightIcon size={18} className="text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

MobileInput.displayName = 'MobileInput';

interface MobileSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const MobileSelect = forwardRef<HTMLSelectElement, MobileSelectProps>(
  ({ className, label, error, helperText, options, placeholder, children, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            'block w-full rounded-lg border border-gray-300 px-3 py-3 text-base',
            'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'placeholder-gray-400',
            'transition-all duration-200',
            'bg-white',
            error && 'border-red-300 focus:ring-red-500 focus:border-red-500',
            'disabled:bg-gray-100 disabled:cursor-not-allowed',
            // Touch-friendly styles
            'touch-manipulation',
            'text-gray-900',
            className
          )}
          style={{ WebkitTapHighlightColor: 'transparent' }}
          {...props}
        >
          {placeholder && (
            <option value="">{placeholder}</option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
          {children}
        </select>
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

MobileSelect.displayName = 'MobileSelect';

interface MobileTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  autoResize?: boolean;
}

export const MobileTextarea = forwardRef<HTMLTextAreaElement, MobileTextareaProps>(
  ({ className, label, error, helperText, autoResize = false, ...props }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useImperativeHandle(ref, () => textareaRef.current!);

    // Auto-resize functionality
    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
      if (autoResize && textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
      props.onInput?.(e);
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <textarea
          ref={textareaRef}
          className={cn(
            'block w-full rounded-lg border border-gray-300 px-3 py-3 text-base',
            'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'placeholder-gray-400',
            'transition-all duration-200',
            'resize-none',
            error && 'border-red-300 focus:ring-red-500 focus:border-red-500',
            'disabled:bg-gray-100 disabled:cursor-not-allowed',
            // Touch-friendly styles
            'touch-manipulation',
            'text-gray-900',
            className
          )}
          style={{ WebkitTapHighlightColor: 'transparent' }}
          rows={4}
          onInput={handleInput}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

MobileTextarea.displayName = 'MobileTextarea';

interface MobileCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
}

export const MobileCheckbox = forwardRef<HTMLInputElement, MobileCheckboxProps>(
  ({ className, label, description, error, ...props }, ref) => {
    return (
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            ref={ref}
            type="checkbox"
            className={cn(
              'h-5 w-5 rounded border-gray-300 text-blue-600',
              'focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              'transition-all duration-200',
              'touch-manipulation',
              error && 'border-red-300 focus:ring-red-500',
              className
            )}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            {...props}
          />
        </div>
        {(label || description) && (
          <div className="ml-3 text-sm">
            {label && (
              <label className="font-medium text-gray-700">{label}</label>
            )}
            {description && (
              <p className="text-gray-500">{description}</p>
            )}
            {error && (
              <p className="text-red-600 mt-1">{error}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);

MobileCheckbox.displayName = 'MobileCheckbox';

interface MobileSwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
}

export const MobileSwitch = forwardRef<HTMLInputElement, MobileSwitchProps>(
  ({ className, label, description, ...props }, ref) => {
    const [isOn, setIsOn] = useState(props.checked || false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setIsOn(e.target.checked);
      props.onChange?.(e);
    };

    return (
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {label && (
            <label className="block text-sm font-medium text-gray-700">
              {label}
            </label>
          )}
          {description && (
            <p className="text-sm text-gray-500">{description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            const input = ref as React.RefObject<HTMLInputElement>;
            if (input.current) {
              input.current.checked = !isOn;
              handleChange({ ...{ currentTarget: input.current }, target: input.current } as React.ChangeEvent<HTMLInputElement>);
            }
          }}
          className={cn(
            'relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            'touch-manipulation',
            isOn ? 'bg-blue-600' : 'bg-gray-200'
          )}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <input
            ref={ref}
            type="checkbox"
            className="sr-only"
            checked={isOn}
            onChange={handleChange}
            {...props}
          />
          <span
            className={cn(
              'inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-200',
              isOn ? 'translate-x-7' : 'translate-x-1'
            )}
          />
        </button>
      </div>
    );
  }
);

MobileSwitch.displayName = 'MobileSwitch';

interface MobileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ComponentType<{ size?: number; className?: string }>;
  rightIcon?: React.ComponentType<{ size?: number; className?: string }>;
}

export const MobileButton = forwardRef<HTMLButtonElement, MobileButtonProps>(
  ({
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    children,
    disabled,
    ...props
  }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 touch-manipulation focus:outline-none focus:ring-2 focus:ring-offset-2';

    const variantClasses = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 active:bg-blue-800 active:scale-[0.98]',
      secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500 active:bg-gray-300 active:scale-[0.98]',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 active:bg-red-800 active:scale-[0.98]',
      ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500 active:bg-gray-200 active:scale-[0.98]',
    };

    const sizeClasses = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-3 text-base',
      lg: 'px-6 py-4 text-lg',
    };

    const disabledClasses = 'opacity-50 cursor-not-allowed active:scale-100';

    return (
      <button
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          (disabled || loading) && disabledClasses,
          className
        )}
        disabled={disabled || loading}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {!loading && LeftIcon && <LeftIcon size={18} className="mr-2" />}
        {children}
        {!loading && RightIcon && <RightIcon size={18} className="ml-2" />}
      </button>
    );
  }
);

MobileButton.displayName = 'MobileButton';

interface MobileFormProps {
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  className?: string;
}

export const MobileForm = forwardRef<HTMLFormElement, MobileFormProps>(
  ({ children, onSubmit, className, ...props }, ref) => {
    return (
      <form
        ref={ref}
        onSubmit={onSubmit}
        className={cn('space-y-4', className)}
        noValidate
        {...props}
      />
    );
  }
);

MobileForm.displayName = 'MobileForm';