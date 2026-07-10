import React from 'react';
import { clsx } from 'clsx';
import { FileText, UserX, Ban } from 'lucide-react';

export type ModoFacturacion = 'con_datos' | 'sin_nombre' | 'no_facturar';

interface ModoFacturacionCardsProps {
  /** Modo actualmente seleccionado (derivado en el padre desde esSinNombre / noFacturar). */
  selected: ModoFacturacion;
  /** Se invoca al elegir un modo. El padre se encarga de fijar esSinNombre / noFacturar. */
  onChange: (modo: ModoFacturacion) => void;
  /**
   * Restringe qué tarjetas se muestran. Default: las 3. Usado por el modal de
   * "facturar sub-venta" para omitir "No facturar" (no aplica: la acción
   * explícita ahí siempre es emitir factura).
   */
  modes?: ModoFacturacion[];
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

interface ModoFacturacionBannerProps {
  icon: React.ReactNode;
  label: string;
  /** Ej. chip "Requerido" para el modo con_datos. */
  badge?: React.ReactNode;
  /** Ej. `<DatosFiscalesForm />` para el modo con_datos. */
  children?: React.ReactNode;
}

/**
 * Confirmación visual liviana del modo de facturación elegido. Sin párrafo
 * explicativo: los valores reales (NIT/documento/nombre por default) los
 * arma `useFacturacionForm`/`buildDatosFiscales()` sin depender de este texto.
 */
export const ModoFacturacionBanner: React.FC<ModoFacturacionBannerProps> = ({
  icon,
  label,
  badge,
  children,
}) => (
  <div className="rounded-xl border border-coffee-200 bg-coffee-50 px-3 py-2.5">
    <div className="flex items-center gap-2">
      {icon}
      <p className="text-[10px] font-bold text-coffee-700 uppercase tracking-wider">{label}</p>
      {badge}
    </div>
    {children && <div className="mt-2.5">{children}</div>}
  </div>
);

export const ModoFacturacionCards: React.FC<ModoFacturacionCardsProps> = ({
  selected,
  onChange,
  modes,
}) => {
  const visibleModes = modes ? MODES.filter(m => modes.includes(m.id)) : MODES;
  return (
    <div className={clsx('grid grid-cols-1 gap-2', visibleModes.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
      {visibleModes.map((mode) => {
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
