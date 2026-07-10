import React, { useEffect, useState } from 'react';
import { X, Receipt, FileText } from 'lucide-react';
import { useSubVenta } from '../../hooks/useSubVenta';
import { FacturarSubVentaModal } from './FacturarSubVentaModal';
import { Overlay } from '../ui';
import { formatFechaHoraBolivia } from '../../utils/formatters';
import type { Customer, SubVentaPendiente } from '../../types';
import type { PuntoVentaSeleccionado } from '../../contexts/PuntoVentaContext';

interface SubVentasPendientesPanelProps {
  formatCurrency: (n: number) => string;
  onBack: () => void;
  customers: Customer[];
  puntoVentaActual: PuntoVentaSeleccionado | null;
}

/**
 * Listado simple de sub-ventas (cobros parciales) que se cobraron sin
 * factura al momento y siguen disponibles para facturarse después, en
 * cualquier momento — no hace falta rehacer el cobro ni buscar de qué
 * ronda salió.
 */
export const SubVentasPendientesPanel: React.FC<SubVentasPendientesPanelProps> = ({
  formatCurrency,
  onBack,
  customers,
  puntoVentaActual,
}) => {
  const { pendientes, loading, listarPendientes } = useSubVenta();
  const [facturando, setFacturando] = useState<SubVentaPendiente | null>(null);

  useEffect(() => {
    listarPendientes();
  }, [listarPendientes]);

  return (
    <div className="bg-white w-full sm:max-w-md md:max-w-2xl rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
      <div className="bg-coffee-800 px-4 md:px-5 py-3 md:py-3.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
            <Receipt className="h-4 w-4 text-cream" />
          </div>
          <p className="text-cream font-semibold text-sm">Sub-ventas pendientes de facturar</p>
        </div>
        <button
          onClick={onBack}
          className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center text-coffee-300 hover:bg-white/20"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="overflow-y-auto flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-coffee-300 border-t-coffee-800 rounded-full animate-spin" />
          </div>
        ) : pendientes.length === 0 ? (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
            <p className="text-sm font-bold text-emerald-700">No hay sub-ventas pendientes</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">Todos los cobros parciales ya tienen factura.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendientes.map(sv => (
              <div key={sv.id} className="rounded-xl border border-coffee-100 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-coffee-900">{sv.origen}</p>
                    <p className="text-[11px] text-coffee-400">
                      {formatFechaHoraBolivia(sv.fecha)} · {sv.cajero} · {sv.cantidadLineas} líneas
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-coffee-900">{formatCurrency(sv.monto)}</p>
                    <button
                      title="Facturar este cobro"
                      onClick={() => setFacturando(sv)}
                      className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 text-coffee-500 hover:bg-coffee-100"
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {facturando && (
        <Overlay onClose={() => setFacturando(null)}>
          <FacturarSubVentaModal
            subVenta={facturando}
            customers={customers}
            puntoVentaActual={puntoVentaActual}
            formatCurrency={formatCurrency}
            onBack={() => setFacturando(null)}
            onFacturada={() => {
              setFacturando(null);
              listarPendientes();
            }}
          />
        </Overlay>
      )}
    </div>
  );
};
