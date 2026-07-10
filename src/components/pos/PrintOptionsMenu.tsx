import React, { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { Printer, ChevronDown } from 'lucide-react';

export interface PrintMenuOption {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface PrintOptionsMenuProps {
  options: PrintMenuOption[];
  /** Clase del botón trigger (ícono + flecha). Default: estilo neutro compacto. */
  triggerClassName?: string;
}

/**
 * Ícono de impresora + flecha que abre un menú con varias opciones de
 * impresión (ej. "Factura SIAT" / "Recibo"). Mismo patrón visual que
 * `PrintMenuDropdown` de `SalesTable.tsx`, pero genérico y reusable fuera
 * de esa tabla. Si solo hay 1 opción, se muestra igual como menú (consistencia
 * visual) — el caller decide si prefiere renderizar un botón simple en ese caso.
 */
export const PrintOptionsMenu: React.FC<PrintOptionsMenuProps> = ({
  options,
  triggerClassName,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!anchorRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [isOpen]);

  if (options.length === 0) return null;

  return (
    <div className="relative" ref={anchorRef}>
      <button
        title="Imprimir"
        onClick={() => setIsOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={triggerClassName ?? 'h-5 w-5 rounded flex items-center justify-center text-emerald-600 hover:bg-emerald-200 transition-colors flex-shrink-0'}
      >
        <Printer className="h-3 w-3" />
        {options.length > 1 && <ChevronDown className="h-2.5 w-2.5" />}
      </button>
      {isOpen && (
        <div
          className="absolute right-0 mt-1 z-20 bg-white border border-coffee-200 rounded-lg shadow-xl w-52 py-1"
          role="menu"
        >
          {options.map((opt, idx) => (
            <button
              key={idx}
              className={clsx(
                'w-full flex items-center gap-2 px-3 py-2 text-[13px] text-coffee-800 hover:bg-coffee-50 transition-colors text-left',
                idx > 0 && 'border-t border-coffee-100',
              )}
              onClick={() => { opt.onClick(); setIsOpen(false); }}
              role="menuitem"
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
