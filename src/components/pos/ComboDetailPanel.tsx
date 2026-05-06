import React from 'react';
import { Plus, X } from 'lucide-react';

interface ComboDetailItem { name: string; quantity: number; emoji: string }

interface ComboDetailPanelProps {
  product: { id: string; name: string; salePrice: number };
  details: ComboDetailItem[];
  formatCurrency: (n: number) => string;
  onAdd: () => void;
  onClose: () => void;
}

export const ComboDetailPanel: React.FC<ComboDetailPanelProps> = ({
  product,
  details,
  formatCurrency,
  onAdd,
  onClose,
}) => (
  <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
    <div className="bg-coffee-800 px-5 py-4 flex items-center justify-between">
      <div>
        <p className="text-[10px] text-coffee-400 uppercase tracking-widest">Contenido del combo</p>
        <h3 className="font-display font-bold text-cream text-lg">{product.name}</h3>
      </div>
      <button onClick={onClose} className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center text-coffee-300 hover:bg-white/20">
        <X className="h-4 w-4" />
      </button>
    </div>
    <div className="divide-y divide-coffee-50">
      {details.map((item, idx) => (
        <div key={idx} className="flex items-center gap-3 px-5 py-3">
          <span className="text-2xl">{item.emoji}</span>
          <p className="flex-1 text-sm font-semibold text-coffee-900">{item.name}</p>
          <span className="text-xs font-bold text-coffee-400 bg-coffee-50 rounded-full px-2.5 py-1">x{item.quantity}</span>
        </div>
      ))}
    </div>
    <div className="px-5 py-4 border-t border-coffee-100 flex items-center justify-between">
      <div>
        <p className="text-xs text-coffee-400">Precio combo</p>
        <p className="text-xl font-display font-black text-coffee-900">{formatCurrency(product.salePrice)}</p>
      </div>
      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-coffee-800 text-cream text-sm font-bold hover:bg-coffee-700 active:scale-95 transition-all"
      >
        <Plus className="h-4 w-4" /> Agregar
      </button>
    </div>
  </div>
);