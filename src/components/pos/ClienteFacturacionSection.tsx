import React from 'react';
import { clsx } from 'clsx';
import { Star, Plus, User, Search, Phone, UserPlus } from 'lucide-react';
import type { Customer } from '../../types';

interface ClienteFacturacionSectionProps {
  customers: Customer[];
  reviewClienteId: string | null;
  onReviewClienteChange: (id: string | null) => void;

  /** Form de "crear cliente nuevo" inline. */
  reviewShowNewCustomerForm: boolean;
  onToggleReviewNewCustomerForm: () => void;
  reviewNewCustomerName: string;
  reviewNewCustomerPhone: string;
  onReviewNewCustomerNameChange: (v: string) => void;
  onReviewNewCustomerPhoneChange: (v: string) => void;
  onCreateCustomer: (nombre: string, celular: string, onCreated: (id: string) => void) => void;
  isCreatingCustomer: boolean;
}

export const ClienteFacturacionSection: React.FC<ClienteFacturacionSectionProps> = ({
  customers,
  reviewClienteId,
  onReviewClienteChange,
  reviewShowNewCustomerForm,
  onToggleReviewNewCustomerForm,
  reviewNewCustomerName,
  reviewNewCustomerPhone,
  onReviewNewCustomerNameChange,
  onReviewNewCustomerPhoneChange,
  onCreateCustomer,
  isCreatingCustomer,
}) => {
  const selectedCliente = reviewClienteId
    ? customers.find((c) => String(c.id) === reviewClienteId) ?? null
    : null;

  const handleCreate = () => {
    if (!reviewNewCustomerName.trim() || !reviewNewCustomerPhone.trim()) return;
    onCreateCustomer(reviewNewCustomerName.trim(), reviewNewCustomerPhone.trim(), (id) => {
      onReviewClienteChange(id);
      onReviewNewCustomerNameChange('');
      onReviewNewCustomerPhoneChange('');
      onToggleReviewNewCustomerForm();
    });
  };

  return (
    <div className="space-y-2">
      {reviewShowNewCustomerForm ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <UserPlus className="h-3.5 w-3.5 text-amber-700" />
            <p className="text-xs font-semibold text-amber-800">Nuevo cliente</p>
          </div>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-coffee-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Nombre completo"
              value={reviewNewCustomerName}
              onChange={(e) => onReviewNewCustomerNameChange(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-coffee-200 bg-white text-sm text-coffee-900 placeholder:text-coffee-400 focus:border-coffee-400 focus:outline-none"
              autoFocus
            />
          </div>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-coffee-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Celular"
              value={reviewNewCustomerPhone}
              onChange={(e) => onReviewNewCustomerPhoneChange(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-coffee-200 bg-white text-sm text-coffee-900 placeholder:text-coffee-400 focus:border-coffee-400 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={onToggleReviewNewCustomerForm}
              className="flex-1 py-1.5 rounded-lg border border-coffee-200 bg-white text-coffee-600 text-xs font-semibold hover:bg-coffee-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={
                isCreatingCustomer ||
                !reviewNewCustomerName.trim() ||
                !reviewNewCustomerPhone.trim()
              }
              className="flex-1 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 disabled:bg-coffee-200 disabled:text-coffee-400 transition-colors"
            >
              {isCreatingCustomer ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-coffee-400 pointer-events-none" />
            <select
              value={reviewClienteId ?? ''}
              onChange={(e) => onReviewClienteChange(e.target.value || null)}
              className={clsx(
                'w-full pl-9 pr-9 py-2.5 rounded-xl border-2 text-sm focus:outline-none appearance-none bg-white',
                selectedCliente
                  ? 'border-amber-300 text-coffee-900 font-semibold'
                  : 'border-coffee-200 text-coffee-500',
              )}
            >
              <option value="">— Sin cliente —</option>
              {customers.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.nombre} · {c.puntos ?? 0} pts
                </option>
              ))}
            </select>
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-coffee-400 pointer-events-none" />
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={onToggleReviewNewCustomerForm}
              className="inline-flex items-center gap-1 text-[11px] text-coffee-500 hover:text-amber-600 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Crear cliente nuevo
            </button>
            {selectedCliente && (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-semibold">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {selectedCliente.puntos ?? 0} pts
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
};
