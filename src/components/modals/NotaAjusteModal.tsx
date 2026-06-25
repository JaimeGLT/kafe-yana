import React, { useEffect, useMemo, useState } from 'react';
import { ScrollText, AlertTriangle } from 'lucide-react';
import { Modal, Button, Select } from '../ui';
import { formatCurrency } from '../../utils';
import { esEstadoValidadaSiat } from '../../types/siat';
import { MOTIVOS_AJUSTE, type CrearNotaAjusteRequest } from '../../types/notaAjuste';
import type { Sale, SaleItem } from '../../types';
import {
  calcularMontoDevuelto,
  construirCuerpoNotaAjuste,
  mapearSeleccionados,
  round,
} from '../../lib/notaAjuste';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  /**
   * Devuelve `true` si la nota fue aceptada por el SIAT (Transaccion=true).
   * El padre decide si refresca la lista. Los toasts los dispara `useFacturacion`,
   * no el modal.
   */
  onConfirm: (body: CrearNotaAjusteRequest) => Promise<boolean>;
}

export const NotaAjusteModal: React.FC<Props> = ({ isOpen, onClose, sale, onConfirm }) => {
  // Cantidad a devolver por cada item seleccionado. Clave = `SaleItem.id` (UUID string).
  // Si el item no está en el mapa, no se devuelve.
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [codigoMotivo, setCodigoMotivo] = useState<string>('1');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset al abrir/cerrar.
  useEffect(() => {
    if (isOpen) {
      setSelectedItems({});
      setCodigoMotivo('1');
      setError(null);
    }
  }, [isOpen]);

  // ── Derivados ────────────────────────────────────────────────────────────
  const items = sale?.items ?? [];

  const selectedCount = Object.keys(selectedItems).filter((id) => selectedItems[id] > 0).length;

  const totalDevuelto = useMemo<number>(
    () => calcularMontoDevuelto(mapearSeleccionados(selectedItems, items)),
    [selectedItems, items],
  );

  // Por cada producto seleccionado, `construirCuerpoNotaAjuste` genera el PAR
  // SIAT canónico (trans=1 + trans=2) y el backend lo reconstruye de forma
  // autoritativa a partir del detalle original (regla 1049). El XSD exige
  // minOccurs=2 en <detalle> — seleccionar al menos 1 producto cumple el mínimo.

  // ── Handlers ─────────────────────────────────────────────────────────────
  const toggleItem = (item: SaleItem) => {
    setSelectedItems((prev) => {
      const next = { ...prev };
      if (prev[item.id]) {
        delete next[item.id];
      } else {
        next[item.id] = 1; // por defecto, 1 unidad.
      }
      return next;
    });
  };

  const setItemQty = (itemId: string, qty: number) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const clamped = Math.max(1, Math.min(item.quantity, Math.floor(qty)));
    setSelectedItems((prev) => ({ ...prev, [itemId]: clamped }));
  };

  const handleConfirm = async () => {
    if (!sale?.ventaId) {
      setError('La venta no tiene un id válido para emitir la nota.');
      return;
    }
    if (selectedCount === 0) {
      setError('Seleccioná al menos un producto para ajustar.');
      return;
    }
    const motivoParsed = parseInt(codigoMotivo, 10);
    if (!motivoParsed || !MOTIVOS_AJUSTE.some((m) => m.codigo === motivoParsed)) {
      setError('Selecciona un motivo de ajuste válido.');
      return;
    }

    // Mapear selección a productos resueltos y construir el body canónico.
    // `construirCuerpoNotaAjuste` expande cada producto al par SIAT (trans=1 + trans=2).
    const seleccionados = mapearSeleccionados(selectedItems, items);
    if (seleccionados.length === 0) {
      setError('Ninguno de los productos seleccionados tiene un id de detalle válido.');
      return;
    }

    let body: CrearNotaAjusteRequest;
    try {
      body = construirCuerpoNotaAjuste({
        ventaId: sale.ventaId,
        codigoMotivoAjuste: motivoParsed,
        seleccionados,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo preparar la nota de ajuste.');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const ok = await onConfirm(body);
      if (ok) onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo emitir la nota de ajuste.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!sale) return null;

  const motivoOptions = [
    ...MOTIVOS_AJUSTE.map((m) => ({ value: String(m.codigo), label: `${m.codigo} — ${m.descripcion}` })),
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Emitir Nota de Crédito/Débito" size="md" bottomSheet>
      <div className="space-y-4">
        {/* Aviso: la venta debe estar Validada en SIAT */}
        {!esEstadoValidadaSiat(sale.estadoSiat) && (
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              Esta venta no figura como <strong>Validada</strong> en el SIAT (estado actual:{' '}
              <strong>{sale.estadoSiat ?? '—'}</strong>). Las notas sólo pueden emitirse sobre
              facturas validadas.
            </p>
          </div>
        )}

        {/* Resumen de la venta */}
        <div className="bg-coffee-50 rounded-lg px-4 py-3 text-sm text-coffee-700 space-y-1">
          <div className="flex justify-between">
            <span>Venta:</span>
            <span className="font-mono font-semibold text-coffee-900">{sale.code}</span>
          </div>
          {sale.numeroFactura != null && (
            <div className="flex justify-between">
              <span>N° factura:</span>
              <span className="font-semibold text-coffee-900">{sale.numeroFactura}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Total venta:</span>
            <span className="font-semibold text-coffee-900">{formatCurrency(sale.total)}</span>
          </div>
        </div>

        {/* Lista de productos seleccionables */}
        <div>
          <h4 className="text-sm font-semibold text-coffee-700 mb-2">Productos a ajustar</h4>
          <div className="rounded-lg border border-coffee-100 divide-y divide-coffee-50 max-h-72 overflow-y-auto">
            {items.length === 0 && (
              <p className="text-sm text-coffee-400 px-3 py-3">Esta venta no tiene productos.</p>
            )}
            {items.map((item) => {
              const checked = selectedItems[item.id] != null;
              const qty = selectedItems[item.id] ?? 0;
              return (
                <label
                  key={item.id}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                    checked ? 'bg-coffee-50/60' : 'hover:bg-coffee-50/30'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-coffee-600 flex-shrink-0"
                    checked={checked}
                    onChange={() => toggleItem(item)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-coffee-900 truncate">{item.productName}</p>
                    <p className="text-xs text-coffee-500">
                      {item.quantity} × {formatCurrency(item.unitPrice)}
                      {item.variationName ? ` · ${item.variationName}` : ''}
                    </p>
                  </div>
                  {checked && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-coffee-500">Cantidad:</span>
                      <input
                        type="number"
                        min={1}
                        max={item.quantity}
                        value={qty}
                        onChange={(e) => setItemQty(item.id, Number(e.target.value))}
                        onClick={(e) => e.stopPropagation()}
                        className="w-16 px-2 py-1 text-sm text-right border border-coffee-200 rounded-md focus:border-coffee-400 focus:outline-none"
                      />
                    </div>
                  )}
                  <div className="flex-shrink-0 text-sm font-semibold text-coffee-900 w-24 text-right">
                    {checked
                      ? formatCurrency(round(item.unitPrice * qty, 2))
                      : formatCurrency(item.total)}
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Selector de motivo */}
        <div>
          <label className="block text-sm font-medium text-coffee-700 mb-1">Motivo del ajuste</label>
          <Select value={codigoMotivo} onChange={setCodigoMotivo} options={motivoOptions} />
        </div>

        {/* Resumen en vivo */}
        <div className="flex items-center justify-between bg-coffee-50 rounded-lg px-4 py-3 text-sm">
          <div>
            <p className="text-coffee-500">Productos seleccionados</p>
            <p className="font-bold text-coffee-900">{selectedCount}</p>
          </div>
          <div className="text-right">
            <p className="text-coffee-500">Monto a devolver</p>
            <p className="text-lg font-bold text-coffee-900">{formatCurrency(totalDevuelto)}</p>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            isLoading={isLoading}
            disabled={
              selectedCount === 0 ||
              !esEstadoValidadaSiat(sale.estadoSiat)
            }
            leftIcon={<ScrollText className="h-4 w-4" />}
          >
            Emitir Nota
          </Button>
        </div>
      </div>
    </Modal>
  );
};