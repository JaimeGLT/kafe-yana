import React from 'react';
import { clsx } from 'clsx';
import { Calendar } from 'lucide-react';

interface DatePickerProps {
  label?: string;
  value?: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  error?: string;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Seleccionar fecha',
  error,
  className,
  minDate,
  maxDate,
}) => {
  const inputId = label?.toLowerCase().replace(/\s+/g, '-');

  const formatDateForInput = (date: Date | null | undefined): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (newValue) {
      const [year, month, day] = newValue.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      onChange(date);
    } else {
      onChange(null);
    }
  };

  return (
    <div className={clsx('w-full', className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-coffee-700 mb-1"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type="date"
          value={formatDateForInput(value)}
          onChange={handleInputChange}
          min={formatDateForInput(minDate)}
          max={formatDateForInput(maxDate)}
          className={clsx(
            'block w-full rounded-lg border transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-coffee-200 hover:border-coffee-300',
            'px-4 py-2.5 pr-10 text-sm text-coffee-900',
            'bg-white'
          )}
          placeholder={placeholder}
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-coffee-400">
          <Calendar className="h-4 w-4" />
        </div>
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

// Date Range Picker
interface DateRangePickerProps {
  label?: string;
  startDate?: Date | null;
  endDate?: Date | null;
  onChange: (start: Date | null, end: Date | null) => void;
  startPlaceholder?: string;
  endPlaceholder?: string;
  error?: string;
  className?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  label,
  startDate,
  endDate,
  onChange,
  startPlaceholder = 'Desde',
  endPlaceholder = 'Hasta',
  error,
  className,
}) => {
  const formatDateForInput = (date: Date | null | undefined): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (newValue) {
      const [year, month, day] = newValue.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      onChange(date, endDate ?? null);
    } else {
      onChange(null, endDate ?? null);
    }
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (newValue) {
      const [year, month, day] = newValue.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      onChange(startDate ?? null, date);
    } else {
      onChange(startDate ?? null, null);
    }
  };

  return (
    <div className={clsx('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-coffee-700 mb-1">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={formatDateForInput(startDate)}
          onChange={handleStartChange}
          max={formatDateForInput(endDate)}
          placeholder={startPlaceholder}
          className={clsx(
            'block w-full rounded-lg border transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-coffee-200 hover:border-coffee-300',
            'px-4 py-2.5 text-sm text-coffee-900',
            'bg-white'
          )}
        />
        <span className="text-coffee-500">-</span>
        <input
          type="date"
          value={formatDateForInput(endDate)}
          onChange={handleEndChange}
          min={formatDateForInput(startDate)}
          placeholder={endPlaceholder}
          className={clsx(
            'block w-full rounded-lg border transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-coffee-200 hover:border-coffee-300',
            'px-4 py-2.5 text-sm text-coffee-900',
            'bg-white'
          )}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};