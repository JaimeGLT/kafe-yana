import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { clsx } from 'clsx';

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helpText?: string;
  leftIcon?: React.ReactNode;
  showMessage?: boolean;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  label,
  error,
  helpText,
  leftIcon,
  showMessage = true,
  className,
  id,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
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
            'pr-10',
            'py-2.5 text-sm text-coffee-900 placeholder-coffee-400',
            'bg-white',
            className
          )}
          type={showPassword ? 'text' : 'password'}
          {...props}
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="p-1 text-coffee-400 hover:text-coffee-600 transition-colors cursor-pointer"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {showMessage && error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {helpText && !error && (
        <p className="mt-1 text-sm text-coffee-500">{helpText}</p>
      )}
    </div>
  );
};
