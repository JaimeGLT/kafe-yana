import React from 'react';
import { clsx } from 'clsx';
import { HelpTooltip } from '../ui/Tooltip';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  helpText?: string;
  tooltip?: string;          // ← hover ? tooltip text
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  error,
  helpText,
  tooltip,
  children,
  className,
}) => {
  return (
    <div className={clsx('space-y-1', className)}>
      <label className="flex items-center text-sm font-medium text-coffee-700">
        <span>{label}</span>
        {required && <span className="text-red-500 ml-1">*</span>}
        {tooltip && <HelpTooltip text={tooltip} />}
      </label>
      {children}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {helpText && !error && <p className="text-sm text-coffee-500">{helpText}</p>}
    </div>
  );
};

interface FormRowProps {
  children: React.ReactNode;
  className?: string;
}

export const FormRow: React.FC<FormRowProps> = ({ children, className }) => {
  return (
    <div className={clsx('grid grid-cols-1 md:grid-cols-2 gap-4', className)}>
      {children}
    </div>
  );
};

interface FormActionsProps {
  children: React.ReactNode;
  className?: string;
}

export const FormActions: React.FC<FormActionsProps> = ({ children, className }) => {
  return (
    <div className={clsx('flex items-center justify-end gap-3 pt-4 border-t border-coffee-100', className)}>
      {children}
    </div>
  );
};

interface FormProps {
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  className?: string;
}

export const Form: React.FC<FormProps> = ({ children, onSubmit, className }) => {
  return (
    <form onSubmit={onSubmit} className={clsx('space-y-6', className)}>
      {children}
    </form>
  );
};
