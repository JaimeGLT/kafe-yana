import React from 'react';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';

interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
  disabled?: boolean;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  onSelect: (id: string) => void;
  align?: 'left' | 'right';
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  onSelect,
  align = 'left',
  className,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className={clsx('relative', className)}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      {isOpen && (
        <div
          className={clsx(
            'absolute z-20 mt-1 min-w-48 bg-white rounded-lg border border-coffee-200 shadow-lg py-1',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (!item.disabled) {
                  onSelect(item.id);
                  setIsOpen(false);
                }
              }}
              disabled={item.disabled}
              className={clsx(
                'w-full px-4 py-2 text-left text-sm transition-colors',
                'hover:bg-coffee-50',
                item.disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div className="flex items-center gap-2">
                {item.icon && <span className="text-coffee-500">{item.icon}</span>}
                <span className="text-coffee-700">{item.label}</span>
              </div>
              {item.description && (
                <p className="text-xs text-coffee-500 mt-0.5">{item.description}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Select Dropdown
interface SelectDropdownProps {
  label?: string;
  options: { value: string; label: string; icon?: React.ReactNode }[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  className?: string;
}

export const SelectDropdown: React.FC<SelectDropdownProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  error,
  className,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={clsx('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-coffee-700 mb-1">
          {label}
        </label>
      )}
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={clsx(
            'w-full flex items-center justify-between px-4 py-2.5 rounded-lg border transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent',
            error
              ? 'border-red-500'
              : 'border-coffee-200 hover:border-coffee-300',
            'bg-white text-sm'
          )}
        >
          <span className={selectedOption ? 'text-coffee-900' : 'text-coffee-400'}>
            {selectedOption?.label || placeholder}
          </span>
          <ChevronDown className={clsx('h-4 w-4 text-coffee-400 transition-transform', isOpen && 'rotate-180')} />
        </button>

        {isOpen && (
          <div className="absolute z-20 mt-1 w-full bg-white rounded-lg border border-coffee-200 shadow-lg max-h-60 overflow-auto">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={clsx(
                  'w-full px-4 py-2.5 text-left text-sm transition-colors',
                  'hover:bg-coffee-50',
                  value === option.value && 'bg-coffee-50 text-coffee-700 font-medium'
                )}
              >
                <div className="flex items-center gap-2">
                  {option.icon}
                  {option.label}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};