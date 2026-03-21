import React from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helpText,
  leftIcon,
  rightIcon,
  className,
  id,
  ...props
}) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-coffee-700 mb-1"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-coffee-400">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          className={clsx(
            'block w-full rounded-lg border transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-coffee-200 hover:border-coffee-300',
            leftIcon ? 'pl-10' : 'pl-4',
            rightIcon ? 'pr-10' : 'pr-4',
            'py-2.5 text-sm text-coffee-900 placeholder-coffee-400',
            'bg-white',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-coffee-400">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {helpText && !error && (
        <p className="mt-1 text-sm text-coffee-500">{helpText}</p>
      )}
    </div>
  );
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  helpText,
  className,
  id,
  ...props
}) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-coffee-700 mb-1"
        >
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={clsx(
          'block w-full rounded-lg border transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent',
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-coffee-200 hover:border-coffee-300',
          'px-4 py-2.5 text-sm text-coffee-900 placeholder-coffee-400',
          'bg-white resize-none',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {helpText && !error && (
        <p className="mt-1 text-sm text-coffee-500">{helpText}</p>
      )}
    </div>
  );
};