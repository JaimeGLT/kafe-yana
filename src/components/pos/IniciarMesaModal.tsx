import React, { useState } from 'react';
import { X, UtensilsCrossed, ShoppingBag } from 'lucide-react';

interface IniciarMesaModalProps {
  mesa: { id: string; name: string };
  tipo?: 'mesa' | 'para_llevar';
  iniciarClienteId: string;
  showNewCustomerForm: boolean;
  isStartingMesa: boolean;
  customers: Array<{ id: string; nombre: string }>;
  getOrCreateProfile: (customerId: string) => { points: number } | null;
  onClienteChange: (id: string) => void;
  onToggleNewCustomerForm: () => void;
  onIniciar: (clienteIdOverride?: string) => void;
  onClose: () => void;
  newCustomerName: string;
  newCustomerPhone: string;
  isCreatingCustomer: boolean;
  onNewCustomerNameChange: (v: string) => void;
  onNewCustomerPhoneChange: (v: string) => void;
  onCreateCustomer: (onCreated: (id: string) => void) => void;
}

export const IniciarMesaModal: React.FC<IniciarMesaModalProps> = ({
  mesa,
  tipo = 'mesa',
  iniciarClienteId,
  showNewCustomerForm,
  isStartingMesa,
  customers,
  getOrCreateProfile,
  onClienteChange,
  onToggleNewCustomerForm,
  onIniciar,
  onClose,
  newCustomerName,
  newCustomerPhone,
  isCreatingCustomer,
  onNewCustomerNameChange,
  onNewCustomerPhoneChange,
  onCreateCustomer,
}) => {
  const [localName, setLocalName] = useState(newCustomerName);
  const [localPhone, setLocalPhone] = useState(newCustomerPhone);

  const handleCreateAndStart = () => {
    onCreateCustomer(id => { onIniciar(id); });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-coffee-800 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
              {tipo === 'para_llevar'
                ? <ShoppingBag className="h-5 w-5 text-cream" />
                : <UtensilsCrossed className="h-5 w-5 text-cream" />
              }
            </div>
            <div>
              <p className="text-[10px] text-coffee-400 uppercase tracking-widest">Iniciar</p>
              <h3 className="font-display font-bold text-cream text-lg">{mesa.name}</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center text-coffee-300 hover:bg-white/20">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-coffee-400 uppercase tracking-wider">
                Cliente <span className="font-normal text-coffee-300">(opcional)</span>
              </label>
              <button
                onClick={onToggleNewCustomerForm}
                className="text-xs font-semibold text-amber-600 hover:text-amber-500 transition-colors"
              >
                {showNewCustomerForm ? 'Cancelar' : '+ Registrar nuevo'}
              </button>
            </div>

            {showNewCustomerForm ? (
              <div className="space-y-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
                <p className="text-xs font-semibold text-amber-800">Nuevo cliente</p>
                <input
                  autoFocus
                  type="text"
                  placeholder="Nombre completo"
                  value={localName}
                  onChange={e => { setLocalName(e.target.value); onNewCustomerNameChange(e.target.value); }}
                  className="w-full px-3 py-2.5 rounded-lg border border-amber-200 focus:border-amber-400 focus:outline-none text-sm text-coffee-900 bg-white placeholder:text-coffee-300"
                />
                <input
                  type="tel"
                  placeholder="Número de teléfono"
                  value={localPhone}
                  onChange={e => { setLocalPhone(e.target.value); onNewCustomerPhoneChange(e.target.value); }}
                  onKeyDown={e => e.key === 'Enter' && handleCreateAndStart()}
                  className="w-full px-3 py-2.5 rounded-lg border border-amber-200 focus:border-amber-400 focus:outline-none text-sm text-coffee-900 bg-white placeholder:text-coffee-300"
                />
                <button
                  onClick={handleCreateAndStart}
                  disabled={!localName.trim() || !localPhone.trim() || isCreatingCustomer}
                  className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  {isCreatingCustomer ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Guardando...
                    </>
                  ) : 'Guardar cliente e iniciar'}
                </button>
              </div>
            ) : (
              <select
                value={iniciarClienteId}
                onChange={e => onClienteChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-coffee-100 focus:border-coffee-400 focus:outline-none text-sm text-coffee-900 bg-white"
              >
                <option value="">— Sin cliente —</option>
                {customers.map(c => {
                  const prof = getOrCreateProfile(c.id);
                  return (
                    <option key={c.id} value={c.id}>
                      {c.nombre}{prof ? ` · ${prof.points} pts` : ''}
                    </option>
                  );
                })}
              </select>
            )}
          </div>
          <button
            onClick={() => onIniciar()}
            disabled={isStartingMesa}
            className="w-full py-4 rounded-2xl bg-coffee-800 text-cream font-bold text-base hover:bg-coffee-700 active:scale-95 transition-all shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isStartingMesa ? (
              <>
                <div className="w-4 h-4 border-2 border-cream/40 border-t-cream rounded-full animate-spin" />
                Iniciando...
              </>
            ) : tipo === 'para_llevar' ? 'Iniciar pedido para llevar' : `Iniciar ${mesa.name}`}
          </button>
        </div>
      </div>
    </div>
  );
};