import React from 'react';
import { clsx } from 'clsx';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
  className?: string;
  autoFocus?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Buscar...',
  onClear,
  className,
  autoFocus = false,
}) => {
  return (
    <div className={clsx('relative', className)}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-coffee-400">
        <Search className="h-4 w-4" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={clsx(
          'block w-full rounded-lg border border-coffee-200',
          'pl-10 pr-10 py-2.5 text-sm text-coffee-900 placeholder-coffee-400',
          'focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent',
          'hover:border-coffee-300 transition-colors'
        )}
      />
      {value && onClear && (
        <button
          onClick={() => {
            onChange('');
            onClear?.();
          }}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-coffee-400 hover:text-coffee-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

// Search with suggestions
interface SearchWithSuggestionsProps<T> {
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: T) => void;
  suggestions: T[];
  getSuggestionLabel: (item: T) => string;
  getSuggestionValue: (item: T) => string;
  placeholder?: string;
  className?: string;
  renderSuggestion?: (item: T) => React.ReactNode;
}

export function SearchWithSuggestions<T extends { id: string }>({
  value,
  onChange,
  onSelect,
  suggestions,
  getSuggestionLabel,
  getSuggestionValue: _getSuggestionValue,
  placeholder = 'Buscar...',
  className,
  renderSuggestion,
}: SearchWithSuggestionsProps<T>): React.ReactElement {
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const filteredSuggestions = suggestions.filter((item) =>
    getSuggestionLabel(item).toLowerCase().includes(value.toLowerCase())
  );

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        Math.min(prev + 1, filteredSuggestions.length - 1)
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filteredSuggestions[highlightedIndex]) {
      e.preventDefault();
      onSelect(filteredSuggestions[highlightedIndex]);
      setShowSuggestions(false);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div ref={containerRef} className={clsx('relative', className)}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-coffee-400">
        <Search className="h-4 w-4" />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowSuggestions(true);
          setHighlightedIndex(0);
        }}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={clsx(
          'block w-full rounded-lg border border-coffee-200',
          'pl-10 pr-4 py-2.5 text-sm text-coffee-900 placeholder-coffee-400',
          'focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent',
          'hover:border-coffee-300 transition-colors'
        )}
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white rounded-lg border border-coffee-200 shadow-lg max-h-60 overflow-auto">
          {filteredSuggestions.map((item, index) => (
            <button
              key={item.id}
              onClick={() => {
                onSelect(item);
                setShowSuggestions(false);
              }}
              className={clsx(
                'w-full px-4 py-2.5 text-left text-sm transition-colors',
                index === highlightedIndex
                  ? 'bg-coffee-50 text-coffee-700'
                  : 'hover:bg-coffee-50'
              )}
            >
              {renderSuggestion ? renderSuggestion(item) : getSuggestionLabel(item)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}