import React from 'react';
import ReactDOM from 'react-dom';
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
  /** Set false when a parent FormField already renders the error message */
  showMessage?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  helpText,
  placeholder = 'Seleccionar...',
  value,
  onChange,
  showMessage = true,
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
      {showMessage && error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {helpText && !error && (
        <p className="mt-1 text-sm text-coffee-500">{helpText}</p>
      )}
    </div>
  );
};

// Searchable single-select
interface SearchableSelectProps {
  label?: string;
  options: SelectOption[];
  error?: string;
  helpText?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  showMessage?: boolean;
  className?: string;
  id?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  options,
  error,
  helpText,
  placeholder = 'Seleccionar...',
  value,
  onChange,
  showMessage = true,
  className,
  id,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>({});
  const containerRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const selectedOption = options.find((o) => o.value === value);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const updateDropdownPosition = React.useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropdownHeight = 240;
    const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      ...(openUpward
        ? { bottom: window.innerHeight - rect.top, top: 'auto' }
        : { top: rect.bottom + 4, bottom: 'auto' }),
    });
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      setTimeout(() => searchRef.current?.focus(), 0);
    } else {
      setSearch('');
    }
  }, [isOpen, updateDropdownPosition]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleScroll = () => updateDropdownPosition();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen, updateDropdownPosition]);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const inContainer = containerRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inContainer && !inDropdown) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const dropdown = isOpen ? ReactDOM.createPortal(
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="bg-white rounded-lg border border-coffee-200 shadow-lg"
    >
      <div className="p-2 border-b border-coffee-100">
        <input
          ref={searchRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="w-full px-3 py-1.5 text-sm rounded-md border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent"
        />
      </div>
      <div className="max-h-52 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-4 py-3 text-sm text-coffee-400 text-center">Sin resultados</p>
        ) : (
          filtered.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={option.disabled}
              onClick={() => {
                onChange?.(option.value);
                setIsOpen(false);
              }}
              className={clsx(
                'w-full text-left px-4 py-2 text-sm transition-colors',
                option.value === value
                  ? 'bg-coffee-100 text-coffee-900 font-medium'
                  : 'text-coffee-700 hover:bg-coffee-50',
                option.disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {option.label}
            </button>
          ))
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-coffee-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          id={inputId}
          onClick={() => setIsOpen((prev) => !prev)}
          className={clsx(
            'block w-full rounded-lg border transition-colors duration-200 text-left',
            'focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent',
            error ? 'border-red-500 focus:ring-red-500' : 'border-coffee-200 hover:border-coffee-300',
            'px-4 py-2.5 pr-10 text-sm',
            selectedOption ? 'text-coffee-900' : 'text-coffee-400',
            'bg-white cursor-pointer',
            className
          )}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </button>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-coffee-400">
          <ChevronDown className={clsx('h-4 w-4 transition-transform duration-200', isOpen && 'rotate-180')} />
        </div>
      </div>
      {dropdown}
      {showMessage && error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {helpText && !error && <p className="mt-1 text-sm text-coffee-500">{helpText}</p>}
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

// Async searchable select — fetches options server-side on each keystroke
interface AsyncSearchableSelectProps {
  value?: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => Promise<{ value: string; label: string }[]>;
  placeholder?: string;
  error?: string;
  label?: string;
}

export const AsyncSearchableSelect: React.FC<AsyncSearchableSelectProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = 'Buscar...',
  error,
  label,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [options, setOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>({});

  const containerRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearchRef = React.useRef(onSearch);
  onSearchRef.current = onSearch;

  const updateDropdownPosition = React.useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropdownHeight = 240;
    const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      ...(openUpward
        ? { bottom: window.innerHeight - rect.top, top: 'auto' }
        : { top: rect.bottom + 4, bottom: 'auto' }),
    });
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      setTimeout(() => searchRef.current?.focus(), 0);
    } else {
      setSearch('');
      setOptions([]);
    }
  }, [isOpen, updateDropdownPosition]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleScroll = () => updateDropdownPosition();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen, updateDropdownPosition]);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!containerRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;
    if (search.length < 2) {
      setOptions([]);
      setIsLoading(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await onSearchRef.current(search);
        setOptions(results);
      } catch {
        setOptions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, isOpen]);

  const dropdown = isOpen ? ReactDOM.createPortal(
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="bg-white rounded-lg border border-coffee-200 shadow-lg"
    >
      <div className="p-2 border-b border-coffee-100">
        <input
          ref={searchRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Escribir para buscar..."
          className="w-full px-3 py-1.5 text-sm rounded-md border border-coffee-200 focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent"
        />
      </div>
      <div className="max-h-52 overflow-y-auto">
        {isLoading ? (
          <p className="px-4 py-3 text-sm text-coffee-400 text-center">Buscando...</p>
        ) : search.length < 2 ? (
          <p className="px-4 py-3 text-sm text-coffee-400 text-center">Escriba al menos 2 caracteres</p>
        ) : options.length === 0 ? (
          <p className="px-4 py-3 text-sm text-coffee-400 text-center">Sin resultados</p>
        ) : (
          options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={clsx(
                'w-full text-left px-4 py-2 text-sm transition-colors',
                opt.value === value
                  ? 'bg-coffee-100 text-coffee-900 font-medium'
                  : 'text-coffee-700 hover:bg-coffee-50'
              )}
            >
              {opt.label}
            </button>
          ))
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-coffee-700 mb-1">{label}</label>
      )}
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={clsx(
            'block w-full rounded-lg border transition-colors duration-200 text-left',
            'focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent',
            error ? 'border-red-500 focus:ring-red-500' : 'border-coffee-200 hover:border-coffee-300',
            'px-4 py-2.5 pr-10 text-sm',
            value ? 'text-coffee-900' : 'text-coffee-400',
            'bg-white cursor-pointer'
          )}
        >
          {value || placeholder}
        </button>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-coffee-400">
          <ChevronDown className={clsx('h-4 w-4 transition-transform duration-200', isOpen && 'rotate-180')} />
        </div>
      </div>
      {dropdown}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};