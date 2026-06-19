import React from 'react';
import { clsx } from 'clsx';
import { FileText, UserX, Ban } from 'lucide-react';

export type ModoFacturacion = 'con_datos' | 'sin_nombre' | 'no_facturar';

interface ModoFacturacionCardsProps {
  /** Modo actualmente seleccionado (derivado en el padre desde esSinNombre / noFacturar). */
  selected: ModoFacturacion;
  /** Se invoca al elegir un modo. El padre se encarga de fijar esSinNombre / noFacturar. */
  onChange: (modo: ModoFacturacion) => void;
}

const MODES: {
  id: ModoFacturacion;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'con_datos',
    label: 'Con datos',
    description: 'Documento + nombre',
    icon: <FileText className="h-4 w-4" />,
  },
  {
    id: 'sin_nombre',
    label: 'S/N',
    description: 'Sin Nombre',
    icon: <UserX className="h-4 w-4" />,
  },
  {
    id: 'no_facturar',
    label: 'No facturar',
    description: 'Solo registro',
    icon: <Ban className="h-4 w-4" />,
  },
];

export const ModoFacturacionCards: React.FC<ModoFacturacionCardsProps> = ({
  selected,
  onChange,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {MODES.map((mode) => {
        const isSelected = selected === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => onChange(mode.id)}
            className={clsx(
              'flex flex-row sm:flex-col items-center sm:items-start gap-2.5 sm:gap-1.5 px-3 py-2.5 rounded-xl border-2 text-left transition-all',
              isSelected
                ? 'border-coffee-700 bg-coffee-50 ring-2 ring-coffee-200 shadow-sm'
                : 'border-coffee-200 bg-white hover:border-coffee-400 hover:bg-coffee-50/50',
            )}
          >
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className={clsx(
                  'inline-block h-3.5 w-3.5 rounded-full border-2 transition-colors',
                  isSelected ? 'border-coffee-700 bg-coffee-700' : 'border-coffee-300',
                )}
              >
                {isSelected && (
                  <span className="block h-full w-full rounded-full border-2 border-white scale-50" />
                )}
              </span>
              <span
                className={clsx(
                  'inline-flex h-5 w-5 items-center justify-center rounded-md flex-shrink-0',
                  isSelected ? 'text-coffee-700' : 'text-coffee-400',
                )}
              >
                {mode.icon}
              </span>
            </div>
            <div className="flex-1 min-w-0 sm:pl-0">
              <p
                className={clsx(
                  'text-xs font-bold leading-tight',
                  isSelected ? 'text-coffee-900' : 'text-coffee-700',
                )}
              >
                {mode.label}
              </p>
              <p
                className={clsx(
                  'text-[10px] leading-tight',
                  isSelected ? 'text-coffee-600' : 'text-coffee-400',
                )}
              >
                {mode.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
};
