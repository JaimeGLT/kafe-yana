import React from 'react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

interface NuevaMesaModalProps {
  editMesaId: string | null;
  nuevaMesaName: string;
  isSavingMesa: boolean;
  onNameChange: (v: string) => void;
  onSave: () => Promise<void>;
  onClose: () => void;
}

export const NuevaMesaModal: React.FC<NuevaMesaModalProps> = ({
  editMesaId,
  nuevaMesaName,
  isSavingMesa,
  onNameChange,
  onSave,
  onClose,
}) => {
  const handleSave = async () => {
    try {
      await onSave();
      onClose();
    } catch {
      // error already shown via toast in hooks
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && nuevaMesaName.trim() && !isSavingMesa) {
      handleSave();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <div className="bg-white w-full sm:max-w-xs rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-coffee-800 px-6 py-4 flex items-center justify-between">
          <h3 className="font-display font-bold text-white text-lg">
            {editMesaId ? 'Editar mesa' : 'Nueva mesa'}
          </h3>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center text-slate-400 hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Nombre de la mesa
            </label>
            <input
              type="text"
              placeholder="Ej: Mesa 5, Terraza 1, Barra..."
              value={nuevaMesaName}
              onChange={e => onNameChange(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-coffee-500 focus:outline-none text-slate-900 text-sm font-medium"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={!nuevaMesaName.trim() || isSavingMesa}
            className={clsx(
              'w-full py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2',
              nuevaMesaName.trim() && !isSavingMesa
                ? 'bg-coffee-600 hover:bg-coffee-500 text-white active:scale-95 shadow'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed',
            )}
          >
            {isSavingMesa ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                {editMesaId ? 'Guardando...' : 'Creando...'}
              </>
            ) : editMesaId ? 'Guardar cambios' : 'Crear mesa'}
          </button>
        </div>
      </div>
    </div>
  );
};