import React from 'react';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helpText?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  helpText,
  placeholder = 'Seleccionar...',
  value,
  onChange,
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
        <select
          id={inputId}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className={clsx(
            'block w-full rounded-lg border transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-coffee-200 hover:border-coffee-300',
            'px-4 py-2.5 pr-10 text-sm text-coffee-900',
            'bg-white appearance-none cursor-pointer',
            className
          )}
          {...props}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-coffee-400">
          <ChevronDown className="h-4 w-4" />
        </div>
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

// Multi-select with checkboxes
interface MultiSelectProps {
  label?: string;
  options: SelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
  helpText?: string;
  placeholder?: string;
  className?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  options,
  value,
  onChange,
  error,
  helpText,
  placeholder = 'Seleccionar...',
  className,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const selectedLabels = options
    .filter((o) => value.includes(o.value))
    .map((o) => o.label)
    .join(', ');

  return (
    <div className={clsx('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-coffee-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={clsx(
            'block w-full rounded-lg border transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-coffee-200 hover:border-coffee-300',
            'px-4 py-2.5 pr-10 text-sm text-left text-coffee-900',
            'bg-white'
          )}
        >
          {selectedLabels || placeholder}
        </button>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-coffee-400">
          <ChevronDown className={clsx('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
        </div>
        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white rounded-lg border border-coffee-200 shadow-lg max-h-60 overflow-auto">
            {options.map((option) => (
              <label
                key={option.value}
                className="flex items-center px-4 py-2 hover:bg-coffee-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={value.includes(option.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onChange([...value, option.value]);
                    } else {
                      onChange(value.filter((v) => v !== option.value));
                    }
                  }}
                  className="h-4 w-4 text-coffee-500 focus:ring-coffee-500 border-coffee-300 rounded"
                />
                <span className="ml-2 text-sm text-coffee-700">{option.label}</span>
              </label>
            ))}
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