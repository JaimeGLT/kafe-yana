import React from 'react';
import { FileText, User, Receipt, CheckCircle, Search } from 'lucide-react';
import { Input } from '../ui';
import type { Customer } from '../../types';

export interface BillingData {
  nit: string;
  name: string;
}

interface BillingModalProps {
  isOpen: boolean;
  saleCode?: string;
  customers?: Customer[];
  onDone: (billing: BillingData) => void;
}

/**
 * Modal de facturación.
 * Flujo:
 *  1. ¿Desea factura? Sí / No
 *  2. Cajero ingresa NIT → sistema busca en clientes existentes → autocompleta nombre
 *     El nombre sigue siendo editable en caso de corrección.
 */
export const BillingModal: React.FC<BillingModalProps> = ({ isOpen, saleCode, customers = [], onDone }) => {
  const [step, setStep] = React.useState<'ask' | 'data'>('ask');
  const [nit, setNit] = React.useState('');
  const [name, setName] = React.useState('');
  const [autofilledFrom, setAutofilledFrom] = React.useState<string | null>(null); // nombre original antes de editar
  const [errors, setErrors] = React.useState<{ nit?: string; name?: string }>({});

  React.useEffect(() => {
    if (isOpen) {
      setStep('ask');
      setNit('');
      setName('');
      setAutofilledFrom(null);
      setErrors({});
    }
  }, [isOpen]);

  // Buscar cliente por NIT cuando cambia el campo
  const handleNitChange = (value: string) => {
    setNit(value);
    setErrors(prev => ({ ...prev, nit: undefined }));

    const match = customers.find(c => c.ruc?.trim() === value.trim() && value.trim() !== '');
    if (match) {
      setName(match.name);
      setAutofilledFrom(match.name);
    } else {
      // Si había un autocomplete anterior y el NIT ya no coincide, limpiar
      if (autofilledFrom !== null) {
        setName('');
        setAutofilledFrom(null);
      }
    }
  };

  const handleNameChange = (value: string) => {
    setName(value);
    // Si el cajero edita el nombre, el badge "autocompletado" desaparece
    if (autofilledFrom !== null && value !== autofilledFrom) {
      setAutofilledFrom(null);
    }
  };

  const handleNo = () => {
    onDone({ nit: '0', name: 'Consumidor Final' });
  };

  const handleSubmitData = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!nit.trim()) errs.nit = 'El NIT/CI es requerido.';
    if (!name.trim()) errs.name = 'El nombre es requerido.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onDone({ nit: nit.trim(), name: name.trim() });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div className="relative bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-coffee-800 px-6 pt-6 pb-5 text-white text-center">
          <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <h3 className="font-display font-bold text-lg">Facturación</h3>
          {saleCode && (
            <p className="text-coffee-300 text-xs mt-0.5 font-mono">{saleCode}</p>
          )}
        </div>

        {step === 'ask' ? (
          <div className="p-6 space-y-5">
            <p className="text-center text-coffee-700 font-medium">
              ¿El cliente desea factura con sus datos?
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setStep('data')}
                className="flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border-2 border-coffee-200 hover:border-coffee-400 hover:bg-coffee-50 transition-all text-coffee-700"
              >
                <User className="h-6 w-6 text-coffee-500" />
                <span className="text-sm font-semibold">Sí, con datos</span>
              </button>

              <button
                onClick={handleNo}
                className="flex flex-col items-center gap-2 py-4 px-3 rounded-2xl bg-coffee-800 hover:bg-coffee-700 transition-all text-white"
              >
                <Receipt className="h-6 w-6" />
                <span className="text-sm font-semibold">No, gracias</span>
              </button>
            </div>

            <p className="text-xs text-center text-coffee-400">
              "No" emite la factura a <strong>Consumidor Final</strong> (NIT: 0)
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmitData} className="p-6 space-y-4">
            {/* NIT */}
            <div>
              <div className="relative">
                <Input
                  label="NIT o CI"
                  value={nit}
                  onChange={e => handleNitChange(e.target.value)}
                  placeholder="Ej: 12345678"
                  autoFocus
                />
                {nit.trim() !== '' && (
                  <div className="absolute right-3 top-[34px]">
                    <Search className="h-4 w-4 text-coffee-300" />
                  </div>
                )}
              </div>
              {errors.nit && <p className="text-xs text-red-600 mt-1">{errors.nit}</p>}
            </div>

            {/* Nombre */}
            <div>
              <div className="relative">
                <Input
                  label="Nombre / Razón Social"
                  value={name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="Ej: Juan Pérez López"
                />
                {autofilledFrom !== null && (
                  <div className="absolute right-3 top-[34px]">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  </div>
                )}
              </div>
              {autofilledFrom !== null && (
                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Cliente encontrado — puedes editar el nombre si es necesario
                </p>
              )}
              {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setStep('ask')}
                className="flex-1 py-3 rounded-xl border-2 border-coffee-200 text-coffee-700 font-semibold text-sm hover:bg-coffee-50 transition-colors"
              >
                Atrás
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-coffee-800 text-white font-bold text-sm hover:bg-coffee-700 transition-all"
              >
                Emitir Factura
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
