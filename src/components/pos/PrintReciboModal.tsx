import React from 'react';
import { Printer, X, MonitorCheck } from 'lucide-react';
import { enviarRecibo } from '../../utils/comandas';
import { formatCurrency } from '../../utils';

type Tamaño = 'pequeño' | 'mediano';

export interface PrintReciboData {
  mesaName: string;
  saleCode: string;
  total: number;
  metodoPago: string;
}

interface PrintReciboModalProps {
  data: PrintReciboData | null;
  onClose: () => void;
}

const METODO_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia / QR',
};

export const PrintReciboModal: React.FC<PrintReciboModalProps> = ({ data, onClose }) => {
  const [tamaño, setTamaño] = React.useState<Tamaño>('mediano');

  if (!data) return null;

  const handlePrint = () => {
    enviarRecibo(data.mesaName, data.saleCode, data.total, data.metodoPago, ['principal']);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white w-full sm:max-w-xs rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-5">

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-coffee-100 flex items-center justify-center">
              <Printer className="h-5 w-5 text-coffee-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-coffee-900">Imprimir recibo</p>
              <p className="text-xs text-coffee-400">{data.mesaName} · {data.saleCode}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-xl bg-coffee-100 flex items-center justify-center text-coffee-500 hover:bg-coffee-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="bg-coffee-50 rounded-2xl px-4 py-3 flex justify-between text-sm">
          <span className="text-coffee-500">Total</span>
          <span className="font-bold text-coffee-900">{formatCurrency(data.total)}</span>
        </div>
        <div className="bg-coffee-50 rounded-2xl px-4 py-3 flex justify-between text-sm -mt-2">
          <span className="text-coffee-500">Método de pago</span>
          <span className="font-bold text-coffee-900">{METODO_LABEL[data.metodoPago] ?? data.metodoPago}</span>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-coffee-600 uppercase tracking-wide">Tamaño de papel</p>
          <div className="grid grid-cols-2 gap-2">
            {(['pequeño', 'mediano'] as Tamaño[]).map((t) => (
              <button
                key={t}
                onClick={() => setTamaño(t)}
                className={`flex flex-col items-center gap-1 py-3 rounded-2xl border-2 transition-all ${
                  tamaño === t
                    ? 'border-coffee-800 bg-coffee-800 text-cream'
                    : 'border-coffee-200 hover:border-coffee-400 hover:bg-coffee-50 text-coffee-700'
                }`}
              >
                <Printer className="h-4 w-4" />
                <span className="text-sm font-bold capitalize">{t === 'pequeño' ? 'Pequeña' : 'Mediana'}</span>
                <span className={`text-[10px] ${tamaño === t ? 'text-coffee-300' : 'text-coffee-400'}`}>
                  {t === 'pequeño' ? '58 mm' : '80 mm'}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-coffee-600 uppercase tracking-wide">Enviar a</p>
          <div className="flex items-center gap-2 py-3 px-4 rounded-2xl border-2 border-coffee-700 bg-coffee-700 text-cream">
            <MonitorCheck className="h-4 w-4" />
            <span className="text-sm font-semibold">Principal</span>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="w-full py-3 rounded-2xl bg-coffee-800 text-cream text-sm font-bold hover:bg-coffee-700 transition-colors flex items-center justify-center gap-2"
        >
          <Printer className="h-4 w-4" />
          Imprimir
        </button>
        <button
          onClick={onClose}
          className="w-full py-2 rounded-xl text-sm text-coffee-500 hover:text-coffee-700 hover:bg-coffee-50 transition-colors"
        >
          No imprimir
        </button>
      </div>
    </div>
  );
};
