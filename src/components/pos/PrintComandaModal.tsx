import React from 'react';
import { Printer, X } from 'lucide-react';
import { enviarPedido } from '../../utils/comandas';

interface ComandaItem {
  cantidad: number;
  nombre: string;
  nota: string;
  ubicacion: string;
}

export interface PrintComandaData {
  mesaName: string;
  roundNumber: number;
  rondaDesc: string;
  items: ComandaItem[];
}

interface PrintComandaModalProps {
  data: PrintComandaData | null;
  onClose: () => void;
}

export const PrintComandaModal: React.FC<PrintComandaModalProps> = ({ data, onClose }) => {
  if (!data) return null;

  const handlePrint = (tamaño: 'pequeño' | 'mediano') => {
    enviarPedido(data.mesaName, data.rondaDesc, data.items, tamaño);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-xs rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-coffee-100 flex items-center justify-center">
              <Printer className="h-5 w-5 text-coffee-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-coffee-900">¿Imprimir comanda?</p>
              <p className="text-xs text-coffee-400">{data.mesaName} · Ronda #{data.roundNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-xl bg-coffee-100 flex items-center justify-center text-coffee-500 hover:bg-coffee-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-coffee-500">Elige el tamaño de papel de la impresora térmica.</p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handlePrint('pequeño')}
            className="flex flex-col items-center gap-1.5 py-4 rounded-2xl border-2 border-coffee-200 hover:border-coffee-400 hover:bg-coffee-50 transition-all"
          >
            <Printer className="h-5 w-5 text-coffee-600" />
            <span className="text-sm font-bold text-coffee-900">Pequeña</span>
            <span className="text-[10px] text-coffee-400">58 mm</span>
          </button>
          <button
            onClick={() => handlePrint('mediano')}
            className="flex flex-col items-center gap-1.5 py-4 rounded-2xl border-2 border-coffee-800 bg-coffee-800 hover:bg-coffee-700 transition-all"
          >
            <Printer className="h-5 w-5 text-cream" />
            <span className="text-sm font-bold text-cream">Mediana</span>
            <span className="text-[10px] text-coffee-300">80 mm</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl text-sm text-coffee-500 hover:text-coffee-700 hover:bg-coffee-50 transition-colors"
        >
          No imprimir
        </button>
      </div>
    </div>
  );
};
