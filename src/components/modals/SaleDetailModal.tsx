import React from 'react';
import {
  CircleCheck,
  FileCheck,
  RotateCcw,
  Banknote,
  Check,
  X,
  ScrollText,
  RefreshCw,
  Ban,
  Undo2,
} from 'lucide-react';
import { Modal } from '../ui';
import { formatCurrency, formatDateTime, getPaymentMethodLabel } from '../../utils';
import { esEstadoAnuladaSiat } from '../../types/siat';
import type { Sale } from '../../types';
import type { NotaAjusteResumen } from '../../types/notaAjuste';

interface Props {
  sale: Sale | null;
  onClose: () => void;
  isLoading?: boolean;
  error?: string | null;
  onImprimirSiat?: (ventaId: number) => void | Promise<void>;
  onReenviarSiat?: (ventaId: number) => void | Promise<void>;
  onAnularSiat?: (ventaId: number) => void;
  onRevertirAnulacionSiat?: (ventaId: number) => void;
  /** Abre el modal para emitir una Nota de Crédito/Débito sobre la venta. */
  onNotaAjusteSiat?: (ventaId: number) => void;
}

// Etiqueta humana del motivo de la nota (1=Devolución, 2=Descuento, 3=Corrección, 4=Otros).
const MOTIVO_LABEL: Record<number, string> = {
  1: 'Devolución de productos',
  2: 'Descuento aplicado',
  3: 'Corrección',
  4: 'Otros ajustes',
};

/** Cabecera de sección reusable (estilo spec: 11px, peso 500, gris, mayúsculas). */
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3
    className="text-[11px] font-medium text-coffee-500 uppercase mb-2"
    style={{ letterSpacing: '0.05em' }}
  >
    {children}
  </h3>
);

export const SaleDetailModal: React.FC<Props> = ({
  sale,
  onClose,
  isLoading,
  error,
  onImprimirSiat,
  onReenviarSiat,
  onAnularSiat,
  onRevertirAnulacionSiat,
  onNotaAjusteSiat,
}) => {
  if (!sale && !isLoading && !error) return null;

  if (isLoading) {
    return (
      <Modal isOpen onClose={onClose} title="Cargando detalle..." size="md">
        <div className="flex items-center justify-center py-12">
          <p className="text-coffee-500 text-[13px]">Cargando...</p>
        </div>
      </Modal>
    );
  }

  if (error) {
    return (
      <Modal isOpen onClose={onClose} title="Error" size="md">
        <div className="flex items-center justify-center py-12">
          <p className="text-red-500 text-[13px]">{error}</p>
        </div>
      </Modal>
    );
  }

  if (!sale) return null;

  // ── Derivados ──────────────────────────────────────────────────────────
  const notas: NotaAjusteResumen[] = sale.notasAjuste ?? [];
  const tieneNotas = notas.length > 0;
  const devueltoEnNotas = sale.montoNotasAjuste ?? 0;
  const saldoEfectivo = Math.max(0, sale.total - devueltoEnNotas);
  const saldoAgotadoPorNotas = tieneNotas && saldoEfectivo <= 0;

  // Items que tienen al menos una unidad devuelta por notas válidas.
  const itemsDevueltos = sale.items.filter(
    (it) => Number(it.cantidadDevuelta ?? 0) > 0,
  );

  // Método de pago principal (primer método con monto > 0). En la práctica
  // el mapper actual siempre devuelve 1 método, pero defendemos ante varios.
  const metodoPagoPrincipal = sale.paymentMethods.find((pm) => pm.amount > 0);

  return (
    <Modal
      isOpen={!!sale}
      onClose={onClose}
      size="md"
      showCloseButton={false}
      bottomSheet
    >
      <div className="relative" style={{ maxWidth: '480px' }}>
        {/* Botón cerrar flotante — el Modal ya no muestra su propio header */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 text-coffee-400 hover:text-coffee-600 transition-colors"
          title="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>

        {/* ── Sección 1 — Header ──────────────────────────────────────── */}
        <div className="px-4 py-3.5 border-b border-coffee-100">
          {/* Banner verde de confirmación (solo si hay notas) */}
          {tieneNotas && (
            <div
              className="rounded-lg px-3.5 py-2.5 mb-3 flex items-center gap-2"
              style={{ backgroundColor: '#EAF3DE' }}
            >
              <CircleCheck className="h-4 w-4 flex-shrink-0" style={{ color: '#3B6D11' }} />
              <span
                className="font-medium text-[13px] leading-snug"
                style={{ color: '#3B6D11' }}
              >
                Devolución completada — nota de crédito emitida
              </span>
            </div>
          )}

          {/* Fila: título + meta a la izquierda, badge factura a la derecha */}
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="min-w-0 flex-1">
              <h2 className="text-[17px] font-medium text-coffee-900 leading-tight">
                Venta {sale.code}
              </h2>
              <p className="text-[12px] text-coffee-500 mt-0.5 leading-snug">
                {formatDateTime(sale.date)} · {sale.cashierName ?? 'N/A'} · {sale.customerName ?? 'Sin nombre'}
              </p>
            </div>
            {sale.numeroFactura != null && (
              <span
                className="inline-flex items-center gap-1 rounded-lg text-[11px] font-medium flex-shrink-0"
                style={{
                  backgroundColor: '#E6F1FB',
                  color: '#0C447C',
                  padding: '3px 8px',
                }}
              >
                <FileCheck className="h-3 w-3" />
                Factura Nº {sale.numeroFactura}
              </span>
            )}
          </div>
        </div>

        {/* ── Sección 2 — Productos devueltos ────────────────────────── */}
        {itemsDevueltos.length > 0 && (
          <div className="px-5 py-3.5 border-b border-coffee-100">
            <SectionLabel>Productos devueltos</SectionLabel>
            <div className="divide-y divide-coffee-100">
              {itemsDevueltos.map((item) => {
                const devueltoPorNotas = Number(item.cantidadDevuelta ?? 0);
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-coffee-900 leading-snug truncate">
                        {item.productName ?? 'Producto'}
                      </p>
                      <p className="text-[12px] text-coffee-500 mt-0.5">
                        {devueltoPorNotas} × {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-[12px] text-coffee-400 line-through leading-snug">
                        {formatCurrency(item.total)}
                      </p>
                      <p
                        className="text-[12px] font-medium inline-flex items-center gap-1 mt-0.5"
                        style={{ color: '#3B6D11' }}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Devuelto
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Sección 3 — Resumen de pago ────────────────────────────── */}
        <div className="px-5 py-3.5 border-b border-coffee-100">
          <SectionLabel>Resumen de pago</SectionLabel>
          <div className="grid grid-cols-2 gap-y-1.5 text-[12px]">
            <span className="text-coffee-500">Cobrado originalmente</span>
            <span className="text-coffee-900 text-right font-normal">
              {formatCurrency(sale.total)}
            </span>

            <span className="text-coffee-500 self-center">Pagado con</span>
            <span className="text-right">
              {metodoPagoPrincipal ? (
                <span
                  className="inline-flex items-center gap-1 rounded-lg text-[12px] bg-coffee-50"
                  style={{
                    border: '0.5px solid #E5DCC8',
                    padding: '2px 8px',
                  }}
                >
                  <Banknote className="h-3 w-3" />
                  {getPaymentMethodLabel(metodoPagoPrincipal.type)}
                </span>
              ) : (
                <span className="text-coffee-400">—</span>
              )}
            </span>

            {tieneNotas && (
              <>
                <span className="text-coffee-500">Notas de crédito emitidas</span>
                <span
                  className="text-right font-medium"
                  style={{ color: '#A32D2D' }}
                >
                  −{formatCurrency(devueltoEnNotas)}
                </span>
              </>
            )}

            {/* Divisor de cierre — ocupa las 2 columnas */}
            <div
              className="col-span-2 my-1"
              style={{ borderTop: '0.5px solid #E5DCC8' }}
            />

            <span className="text-[13px] font-medium text-coffee-900">
              Saldo pendiente
            </span>
            <span className="text-[13px] font-medium text-coffee-900 text-right">
              {formatCurrency(saldoEfectivo)}
            </span>
          </div>
        </div>

        {/* ── Sección 4 — Notas de ajuste emitidas ───────────────────── */}
        {tieneNotas && (
          <div className="px-5 py-3.5">
            <SectionLabel>Notas de ajuste emitidas</SectionLabel>
            <div className="space-y-2">
              {notas.map((nota) => {
                const motivo = MOTIVO_LABEL[nota.codigoMotivoAjuste] ?? 'Ajuste';
                const esValidada =
                  (nota.estadoSiat ?? '').toLowerCase() === 'validada';
                return (
                  <div
                    key={nota.id}
                    className="rounded-lg px-3 py-2.5 grid items-start"
                    style={{
                      backgroundColor: '#F7F4EE',
                      gridTemplateColumns: 'auto 1fr auto',
                      columnGap: '12px',
                    }}
                  >
                    {/* Col 1: número + estado SIAT */}
                    <div>
                      <p className="text-[11px] font-medium text-coffee-500">
                        Nota Nº {nota.numeroNotaCreditoDebito}
                      </p>
                      {esValidada && (
                        <p
                          className="text-[11px] inline-flex items-center gap-1 mt-0.5"
                          style={{ color: '#3B6D11' }}
                        >
                          <Check className="h-3 w-3" />
                          Validada SIAT
                        </p>
                      )}
                    </div>

                    {/* Col 2: motivo + fecha */}
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-coffee-900 leading-snug truncate">
                        {motivo}
                      </p>
                      <p className="text-[11px] text-coffee-500 mt-0.5">
                        {formatDateTime(nota.fechaEmision)}
                      </p>
                    </div>

                    {/* Col 3: monto + IVA */}
                    <div className="text-right flex-shrink-0">
                      <p
                        className="text-[14px] font-medium leading-tight"
                        style={{ color: '#A32D2D' }}
                      >
                        −{formatCurrency(nota.montoTotalDevuelto)}
                      </p>
                      <p className="text-[11px] text-coffee-500 mt-0.5">
                        IVA {formatCurrency(nota.montoEfectivoCreditoDebito)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Acciones SIAT (footer operativo, fuera del spec visual) ── */}
        {sale.ventaId && (
          <div className="px-5 py-3 border-t border-coffee-100 flex flex-wrap gap-2">
            {sale.siatAceptada && onImprimirSiat && (
              <button
                onClick={() => onImprimirSiat(sale.ventaId!)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 text-white text-[12px] font-medium px-3 py-1.5 hover:bg-emerald-700 transition-colors"
              >
                <ScrollText className="h-3.5 w-3.5" /> Imprimir factura SIAT
              </button>
            )}
            {sale.siatAceptada &&
              !esEstadoAnuladaSiat(sale.estadoSiat) &&
              !sale.revertidaAnulacion &&
              saldoEfectivo > 0 &&
              onNotaAjusteSiat && (
                <button
                  onClick={() => onNotaAjusteSiat(sale.ventaId!)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 text-white text-[12px] font-medium px-3 py-1.5 hover:bg-indigo-700 transition-colors"
                  title="Emitir una Nota de Crédito o Débito sobre esta venta"
                >
                  <ScrollText className="h-3.5 w-3.5" /> Emitir Nota de Ajuste
                </button>
              )}
            {sale.siatAceptada &&
              !esEstadoAnuladaSiat(sale.estadoSiat) &&
              !sale.revertidaAnulacion &&
              saldoAgotadoPorNotas && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-lg text-[12px] font-medium px-3 py-1.5"
                  style={{ backgroundColor: '#FBF1DA', color: '#8B5E1A', border: '0.5px solid #E8C77A' }}
                  title="El saldo de la venta fue agotado por notas de ajuste válidas."
                >
                  <ScrollText className="h-3.5 w-3.5" /> Saldo agotado
                </span>
              )}
            {!sale.siatAceptada &&
              sale.estadoSiat &&
              !esEstadoAnuladaSiat(sale.estadoSiat) &&
              onReenviarSiat && (
                <button
                  onClick={() => onReenviarSiat(sale.ventaId!)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 text-white text-[12px] font-medium px-3 py-1.5 hover:bg-amber-700 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Reenviar al SIAT
                </button>
              )}
            {sale.siatAceptada &&
              !esEstadoAnuladaSiat(sale.estadoSiat) &&
              !sale.revertidaAnulacion &&
              onAnularSiat && (
                <button
                  onClick={() => onAnularSiat(sale.ventaId!)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 text-white text-[12px] font-medium px-3 py-1.5 hover:bg-red-700 transition-colors"
                  title="Anular la factura en el SIAT"
                >
                  <Ban className="h-3.5 w-3.5" /> Anular en SIAT
                </button>
              )}
            {sale.siatAceptada &&
              !esEstadoAnuladaSiat(sale.estadoSiat) &&
              sale.revertidaAnulacion && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[12px] font-medium px-3 py-1.5"
                  title="La anulación ya fue revertida; el SIAT no permite anularla de nuevo."
                >
                  <Undo2 className="h-3.5 w-3.5" /> No se puede anular
                </span>
              )}
            {esEstadoAnuladaSiat(sale.estadoSiat) &&
              !sale.revertidaAnulacion &&
              onRevertirAnulacionSiat && (
                <button
                  onClick={() => onRevertirAnulacionSiat(sale.ventaId!)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 text-white text-[12px] font-medium px-3 py-1.5 hover:bg-amber-700 transition-colors"
                  title="Revertir la anulación en el SIAT (la factura vuelve a Validada)"
                >
                  <Undo2 className="h-3.5 w-3.5" /> Revertir anulación
                </button>
              )}
            {esEstadoAnuladaSiat(sale.estadoSiat) && sale.revertidaAnulacion && (
              <span
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[12px] font-medium px-3 py-1.5"
                title="La anulación ya fue revertida en el SIAT."
              >
                <Undo2 className="h-3.5 w-3.5" /> Reversión aplicada
              </span>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};