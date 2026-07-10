import React, { useEffect, useMemo, useState } from 'react';
import { ScrollText, AlertTriangle, AlertCircle } from 'lucide-react';
import { Modal, Button, Select } from '../ui';
import { formatCurrency } from '../../utils';
import { esEstadoValidadaSiat } from '../../types/siat';
import type { CrearNotaAjusteRequest } from '../../types/notaAjuste';
import type { Sale, SaleItem } from '../../types';
import { useMotivosAnulacion } from '../../hooks/useMotivosAnulacion';
import {
  calcularCantidadDisponible,
  calcularMontoDevuelto,
  calcularSaldoEfectivo,
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
  // Catálogo de motivos sincronizado contra el SIAT vía
  // `sincronizarParametricaMotivoAnulacion` (única paramétrica de motivos que
  // expone el SIAT — ver WSDL FacturacionSincronizacion). Lo usamos acá para
  // `CodigoMotivoAjuste` del dropdown "Motivo del ajuste" porque el SIAT no
  // publica una paramétrica separada para emisión de notas C/D.
  const {
    items: motivos,
    loading: motivosLoading,
    error: motivosError,
    sincronizado: motivosSincronizado,
    isEmpty: motivosEmpty,
  } = useMotivosAnulacion(isOpen);

  // Cantidad a devolver por cada item seleccionado. Clave = `SaleItem.id` (UUID string).
  // Si el item no está en el mapa, no se devuelve.
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [codigoMotivo, setCodigoMotivo] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset al abrir/cerrar y preseleccionar el primer motivo del catálogo sincronizado.
  useEffect(() => {
    if (isOpen) {
      setSelectedItems({});
      setCodigoMotivo(motivos.length > 0 ? String(motivos[0].codigo) : '');
      setError(null);
    }
  }, [isOpen, motivos]);

  // ── Derivados ────────────────────────────────────────────────────────────
  const items = sale?.items ?? [];

  const selectedCount = Object.keys(selectedItems).filter((id) => selectedItems[id] > 0).length;

  const totalDevuelto = useMemo<number>(
    () => calcularMontoDevuelto(mapearSeleccionados(selectedItems, items)),
    [selectedItems, items],
  );

  // Saldo monetario efectivo de la venta (total − notas válidas).
  // Si es ≤ 0, no se puede emitir más notas — backend también lo rechaza.
  const saldoEfectivo = useMemo<number>(
    () => (sale ? calcularSaldoEfectivo(sale.total, sale.notasAjuste) : 0),
    [sale],
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
    // El tope ya no es la cantidad ORIGINAL de la factura, sino lo que
    // queda realmente disponible después de devoluciones previas. Esto
    // evita devolver más unidades de las que aún existen.
    const disponible = calcularCantidadDisponible(item);
    if (disponible <= 0) return;
    const clamped = Math.max(1, Math.min(disponible, Math.floor(qty)));
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

    // Defensa adicional: el botón ya está deshabilitado, pero si el usuario
    // logra llegar acá con un monto mayor al saldo disponible, mostramos
    // el motivo exacto en lugar de un 500 del backend.
    if (totalDevuelto - 0.01 > saldoEfectivo) {
      setError(
        `El monto a devolver (${formatCurrency(totalDevuelto)}) excede el saldo ` +
        `disponible (${formatCurrency(saldoEfectivo)}).`,
      );
      return;
    }

    const motivoParsed = parseInt(codigoMotivo, 10);
    if (!motivoParsed || !motivos.some((m) => m.codigo === motivoParsed)) {
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

  // Motivos no utilizables: todavía cargando, error de fetch, catálogo vacío o
  // server reporta que NO se sincronizó contra el SIAT (sigue con fallback hardcoded).
  const motivosBloqueados =
    motivosLoading || !!motivosError || motivosEmpty || !motivosSincronizado;

  const motivoOptions = (() => {
    if (motivosLoading) {
      return [{ value: '', label: 'Cargando motivos...', disabled: true }];
    }
    if (motivosError) {
      return [{ value: '', label: 'Error al cargar motivos', disabled: true }];
    }
    if (!motivosSincronizado) {
      return [{ value: '', label: 'Catálogo no sincronizado con SIAT', disabled: true }];
    }
    if (motivosEmpty) {
      return [{ value: '', label: 'No hay motivos disponibles', disabled: true }];
    }
    return [
      { value: '', label: 'Seleccionar motivo...', disabled: true },
      ...motivos.map((m) => ({
        value: String(m.codigo),
        label: `${m.codigo} — ${m.descripcion}`,
      })),
    ];
  })();

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
              const disponible = calcularCantidadDisponible(item);
              const agotado = disponible <= 0;
              const checked = !agotado && selectedItems[item.id] != null;
              const qty = selectedItems[item.id] ?? 0;
              const devueltoPrevio = Number(item.cantidadDevuelta ?? 0);
              return (
                <label
                  key={item.id}
                  className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                    agotado
                      ? 'bg-coffee-50/30 cursor-not-allowed opacity-60'
                      : checked
                        ? 'bg-coffee-50/60 cursor-pointer'
                        : 'hover:bg-coffee-50/30 cursor-pointer'
                  }`}
                  title={agotado ? 'Este producto ya fue devuelto en su totalidad' : undefined}
                >
                  {agotado ? (
                    <div
                      aria-disabled
                      className="h-4 w-4 rounded border-2 border-coffee-300 bg-coffee-100 flex-shrink-0"
                      title="Producto agotado (ya devuelto en su totalidad)"
                    />
                  ) : (
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-coffee-600 flex-shrink-0"
                      checked={checked}
                      onChange={() => toggleItem(item)}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-coffee-900 truncate">{item.productName}</p>
                      {agotado && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5 flex-shrink-0"
                          title={`Ya se devolvieron ${devueltoPrevio} de ${item.quantity} unidades`}
                        >
                          Ya devuelto ({devueltoPrevio}/{item.quantity})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-coffee-500">
                      {item.quantity} × {formatCurrency(item.unitPrice)}
                      {item.variationName ? ` · ${item.variationName}` : ''}
                      {!agotado && devueltoPrevio > 0 && (
                        <span className="ml-2 text-amber-700">
                          · Ya devolviste {devueltoPrevio}, te quedan {disponible}
                        </span>
                      )}
                    </p>
                  </div>
                  {checked && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-coffee-500">Cantidad:</span>
                      <input
                        type="number"
                        min={1}
                        max={disponible}
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

        {/* Aviso: catálogo de motivos no disponible (loading/error/no sync/empty) */}
        {motivosBloqueados && (
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              {motivosLoading && 'Cargando catálogo de motivos de ajuste…'}
              {motivosError && `No se pudo cargar el catálogo: ${motivosError}`}
              {!motivosLoading && !motivosError && !motivosSincronizado &&
                'El catálogo de motivos aún no se sincronizó contra el SIAT. ' +
                'Pedile al administrador que ejecute la sincronización antes de emitir notas.'}
              {!motivosLoading && !motivosError && motivosSincronizado && motivosEmpty &&
                'El catálogo de motivos está vacío. Contactá al administrador.'}
            </p>
          </div>
        )}

        {/* Selector de motivo */}
        <div>
          <label className="block text-sm font-medium text-coffee-700 mb-1">Motivo del ajuste</label>
          <Select value={codigoMotivo} onChange={setCodigoMotivo} options={motivoOptions} />
        </div>

        {/* Resumen en vivo */}
        <div className="grid grid-cols-3 gap-3 bg-coffee-50 rounded-lg px-4 py-3 text-sm">
          <div>
            <p className="text-coffee-500">Seleccionados</p>
            <p className="font-bold text-coffee-900">{selectedCount}</p>
          </div>
          <div>
            <p className="text-coffee-500">A devolver</p>
            <p className="font-bold text-coffee-900">{formatCurrency(totalDevuelto)}</p>
          </div>
          <div className="text-right">
            <p className="text-coffee-500">Saldo efectivo</p>
            <p
              className={`font-bold ${
                saldoEfectivo <= 0 ? 'text-red-600' : 'text-emerald-700'
              }`}
            >
              {formatCurrency(saldoEfectivo)}
            </p>
          </div>
        </div>

        {/* Aviso de saldo agotado: bloquea la emisión de más notas */}
        {saldoEfectivo <= 0 && esEstadoValidadaSiat(sale.estadoSiat) && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
            Esta venta ya fue devuelta en su totalidad. No se pueden emitir más notas.
          </p>
        )}

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
              motivosBloqueados ||
              selectedCount === 0 ||
              !esEstadoValidadaSiat(sale.estadoSiat) ||
              saldoEfectivo <= 0 ||
              totalDevuelto - 0.01 > saldoEfectivo
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