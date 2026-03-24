import React from 'react';
import { FileText, User, Receipt } from 'lucide-react';
import { Input } from '../ui';

export interface BillingData {
  nit: string;
  name: string;
}

interface BillingModalProps {
  isOpen: boolean;
  saleCode?: string;
  onDone: (billing: BillingData) => void;
}

/**
 * Modal de facturación boliviana.
 * Pregunta si el cliente desea factura con sus datos.
 * - No → emite a "Consumidor Final" (NIT: 0)
 * - Sí → pide NIT y Nombre
 * No tiene botón de cierre: toda venta debe tener una factura.
 */
export const BillingModal: React.FC<BillingModalProps> = ({ isOpen, saleCode, onDone }) => {
  const [step, setStep] = React.useState<'ask' | 'data'>('ask');
  const [nit, setNit] = React.useState('');
  const [name, setName] = React.useState('');
  const [errors, setErrors] = React.useState<{ nit?: string; name?: string }>({});

  // Reset cuando se abre
  React.useEffect(() => {
    if (isOpen) {
      setStep('ask');
      setNit('');
      setName('');
      setErrors({});
    }
  }, [isOpen]);

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
      {/* Backdrop */}
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
              {/* Sí */}
              <button
                onClick={() => setStep('data')}
                className="flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border-2 border-coffee-200 hover:border-coffee-400 hover:bg-coffee-50 transition-all text-coffee-700"
              >
                <User className="h-6 w-6 text-coffee-500" />
                <span className="text-sm font-semibold">Sí, con datos</span>
              </button>

              {/* No */}
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
            <p className="text-sm text-coffee-600 text-center">
              Ingresa los datos del cliente para la factura
            </p>

            <div>
              <Input
                label="NIT o CI"
                value={nit}
                onChange={(e) => setNit(e.target.value)}
                placeholder="Ej: 12345678"
                autoFocus
              />
              {errors.nit && <p className="text-xs text-red-600 mt-1">{errors.nit}</p>}
            </div>

            <div>
              <Input
                label="Nombre / Razón Social"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Juan Pérez López"
              />
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
