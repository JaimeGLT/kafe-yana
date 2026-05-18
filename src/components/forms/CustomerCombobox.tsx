import React from 'react';
import { Search, Plus, X, User } from 'lucide-react';
import { clsx } from 'clsx';
import { CustomerModal } from '../modals/CustomerModal';
import type { Customer, CustomerInput } from '../../types';

interface CustomerComboboxProps {
  customers: Customer[];
  value: string;
  onChange: (customerId: string) => void;
  onCreateCustomer: (input: CustomerInput) => Promise<Customer>;
  label?: string;
}

export const CustomerCombobox: React.FC<CustomerComboboxProps> = ({
  customers,
  value,
  onChange,
  onCreateCustomer,
  label = 'Cliente (opcional)',
}) => {
  const [query, setQuery] = React.useState('');
  const [isOpen, setIsOpen] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selected = customers.find((c) => c.id === value) ?? null;

  const filtered = React.useMemo(() => {
    const q = query.toLowerCase();
    return customers
      .filter((c) => c.estado)
      .filter(
        (c) =>
          c.nombre.toLowerCase().includes(q) ||
          c.celular.includes(q) ||
          (c.dni || '').toLowerCase().includes(q)
      )
  }, [customers, query]);

  // Close on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (customer: Customer) => {
    onChange(customer.id);
    setIsOpen(false);
    setQuery('');
  };

  const handleClear = () => {
    onChange('');
    setQuery('');
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleCreate = async (input: CustomerInput) => {
    const newCustomer = await onCreateCustomer(input);
    onChange(newCustomer.id);
    setIsCreating(false);
  };

  return (
    <>
      <div className="w-full relative" ref={containerRef}>
        {label && (
          <label className="block text-sm font-medium text-coffee-700 mb-1">{label}</label>
        )}

        <div className="flex gap-2">
          {selected && !isOpen ? (
            // Selected state
            <div className="flex-1 flex items-center gap-2 px-3 py-2.5 border border-coffee-200 rounded-lg bg-white">
              <div className="h-6 w-6 rounded-full bg-coffee-100 flex items-center justify-center flex-shrink-0">
                <User className="h-3.5 w-3.5 text-coffee-500" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-coffee-900 truncate block">
                  {selected.nombre}
                </span>
                <span className="text-xs text-coffee-400">{selected.celular}</span>
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="p-0.5 rounded hover:bg-coffee-100 text-coffee-400 hover:text-coffee-600 flex-shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            // Search input
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-coffee-400" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={handleInputFocus}
                placeholder="Buscar por nombre, teléfono o CI/NIT..."
                className={clsx(
                  'block w-full rounded-lg border border-coffee-200 hover:border-coffee-300',
                  'focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent',
                  'pl-9 pr-4 py-2.5 text-sm text-coffee-900 bg-white'
                )}
              />
            </div>
          )}

          {/* Create button always visible next to search */}
          <button
            type="button"
            onClick={() => { setIsOpen(false); setIsCreating(true); }}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium flex-shrink-0',
              'border-coffee-200 text-coffee-600 hover:bg-coffee-50 hover:border-coffee-300 transition-colors'
            )}
          >
            <Plus className="h-4 w-4" />
            Nuevo
          </button>
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-20 mt-1 w-full max-w-sm bg-white rounded-lg border border-coffee-200 shadow-lg overflow-hidden">
            {filtered.length > 0 ? (
              <ul className="max-h-48 overflow-y-auto divide-y divide-coffee-50">
                {filtered.map((customer) => (
                  <li key={customer.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(customer)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-coffee-50 text-left"
                    >
                      <div className="h-7 w-7 rounded-full bg-coffee-100 flex items-center justify-center flex-shrink-0">
                        <User className="h-3.5 w-3.5 text-coffee-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-coffee-900 truncate">{customer.nombre}</p>
                        <p className="text-xs text-coffee-400">
                          {customer.celular}
                          {customer.dni ? ` · ${customer.dni}` : ''}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-3 text-sm text-coffee-400 text-center">
                No se encontró ningún cliente
              </div>
            )}
          </div>
        )}
      </div>

      <CustomerModal
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        onSuccess={() => {}}
        onSave={async (input) => { await handleCreate(input); }}
      />
    </>
  );
};
