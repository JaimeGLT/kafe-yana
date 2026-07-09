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
import { Badge, Modal } from '../ui';
import { toast } from '../ui/Toast';
import { formatCurrency, formatDateTime, getPaymentMethodLabel } from '../../utils';
import { esEstadoAnuladaSiat } from '../../types/siat';
import type { Sale } from '../../types';
import type { NotaAjusteResumen } from '../../types/notaAjuste';

interface Props {
  sale: Sale | null;
  onClose: () => void;
  isLoading?: boolean;
  error?: string | null;
  /** Abre el modal de impresión de factura SIAT (con selección de impresoras). */
  onOpenFacturaModal?: () => void;
  /**
   * Abre el modal de "facturar con/sin nombre" con los datos fiscales editables.
   * Se usa tanto para primera facturación (facturado === false) como para
   * corregir y reenviar una factura observada/rechazada (facturado === true),
   * ya que el usuario necesita poder cambiar NIT/razón social erróneos antes
   * de reenviar al SIAT — de lo contrario el reenvío repite el mismo error.
   */
  onFacturarSinFacturar?: (ventaId: number) => void;
  onAnularSiat?: (ventaId: number) => void;
  onRevertirAnulacionSiat?: (ventaId: number) => void;
  /** Abre el modal para emitir una Nota de Crédito/Débito sobre la venta. */
  onNotaAjusteSiat?: (ventaId: number) => void;
  /**
   * Abre el modal de anulación SIAT para una nota C/D específica (estado Validada).
   * Se invoca desde cada fila de "Notas de ajuste emitidas".
   */
  onAnularNotaAjusteSiat?: (nota: NotaAjusteResumen) => void;
  /**
   * Abre el modal de reversión de anulación para una nota C/D específica (estado Anulada).
   */
  onRevertirAnulacionNotaAjusteSiat?: (nota: NotaAjusteResumen) => void;
}

// Etiqueta humana del motivo de la nota (espejo de los códigos SIN
// vigentes a jun-2026: 1=Devolución, 2=Descuento, 3=Corrección, 4=Otros).
// Se usa solo como fallback visual en el detalle cuando el catálogo
// sincronizado no trae descripción; la fuente de verdad sigue siendo
// el backend (`/api/catalogos/motivos-ajuste`).
const MOTIVO_LABEL: Record<number, string> = {
  1: 'Devolución de productos',
  2: 'Descuento aplicado',
  3: 'Corrección',
  4: 'Otros ajustes',
};

/** Cabecera de sección reusable. */
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-xs font-medium text-coffee-500 uppercase tracking-wider mb-2">
    {children}
  </h3>
);

export const SaleDetailModal: React.FC<Props> = ({
  sale,
  onClose,
  isLoading,
  error,
  onOpenFacturaModal,
  onFacturarSinFacturar,
  onAnularSiat,
  onRevertirAnulacionSiat,
  onNotaAjusteSiat,
  onAnularNotaAjusteSiat,
  onRevertirAnulacionNotaAjusteSiat,
}) => {
  // Sin `sale` y nada cargando → modal cerrado.
  if (!sale && !isLoading && !error) return null;

  // Sin `sale` todavía: puede estar cargando la lista por primera vez o
  // haber un error antes de tener datos.
  if (!sale) {
    if (error) {
      return (
        <Modal isOpen onClose={onClose} title="Error" size="md">
          <div className="flex items-center justify-center py-12">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        </Modal>
      );
    }
    return (
      <Modal isOpen onClose={onClose} title="Cargando detalle..." size="md">
        <div className="flex items-center justify-center py-12">
          <p className="text-coffee-500 text-sm">Cargando...</p>
        </div>
      </Modal>
    );
  }

  // ── Derivados ──────────────────────────────────────────────────────────
  const notas: NotaAjusteResumen[] = sale.notasAjuste ?? [];
  const tieneNotas = notas.length > 0;
  const devueltoEnNotas = sale.montoNotasAjuste ?? 0;
  const saldoEfectivo = Math.max(0, sale.total - devueltoEnNotas);
  const saldoAgotadoPorNotas = tieneNotas && saldoEfectivo <= 0;

  // Métodos de pago registrados para esta venta. Una sola entrada cuando
  // el cajero cobró con un único método (lo habitual); varias cuando el
  // cobro se dividió entre métodos (pago mixto). Filtramos montos nulos.
  const metodosPago = sale.paymentMethods.filter((pm) => pm.amount > 0);

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
        <div className="px-5 py-4 border-b border-coffee-100">
          {/* Banner de confirmación (solo si hay notas) */}
          {tieneNotas && (
            <div className="rounded-lg px-3.5 py-2.5 mb-3 flex items-center gap-2 bg-emerald-50">
              <CircleCheck className="h-4 w-4 flex-shrink-0 text-emerald-700" />
              <span className="font-medium text-sm leading-snug text-emerald-700">
                Devolución completada — nota de crédito emitida
              </span>
            </div>
          )}

          <div className="pr-6">
            <h2 className="text-lg font-medium text-coffee-900 leading-tight">
              Venta {sale.code}
            </h2>
            <p className="text-xs text-coffee-500 mt-1 leading-snug">
              {formatDateTime(sale.date)} · {sale.cashierName ?? 'N/A'} · {sale.customerName ?? 'Sin nombre'}
            </p>
            {sale.numeroFactura != null && (
              <Badge variant="info" size="sm" className="gap-1 mt-2.5">
                <FileCheck className="h-3 w-3" />
                Factura Nº {sale.numeroFactura}
              </Badge>
            )}
          </div>
        </div>

        {/* ── Sección 2 — Productos ──────────────────────────────────── */}
        {/*
         * Lista de TODAS las líneas vendidas. La cabecera de la venta (header
         * arriba, resumen de pago abajo) ya viene del listado — esto sólo
         * carga las líneas cuando el hook `useVentaDetalles` las trae.
         *
         * Estados:
         *   - `isLoading` (detalles en vuelo) → 3 filas skeleton animadas.
         *   - `sale.items.length > 0` → lista real.
         *   - `sale.items.length === 0 && !isLoading` → venta sin líneas
         *     (caso defensivo), no se renderiza la sección.
         */}
        {(isLoading || sale.items.length > 0) && (
          <div className="px-5 py-4 bg-coffee-50 border-b border-coffee-100">
            <div className="flex items-center justify-between mb-2">
              <SectionLabel>Productos</SectionLabel>
              {!isLoading && (
                <span className="text-xs text-coffee-500">
                  {sale.items.length} {sale.items.length === 1 ? 'línea' : 'líneas'}
                </span>
              )}
            </div>
            <div className="rounded-xl border border-coffee-200 bg-white shadow-sm px-3.5 py-1">
              {isLoading ? (
                <div className="divide-y divide-coffee-100" aria-busy="true" aria-live="polite">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center justify-between gap-3 py-2.5 animate-pulse">
                      <div className="min-w-0 flex-1">
                        <div className="h-3.5 w-40 bg-coffee-200 rounded" />
                        <div className="h-3 w-24 bg-coffee-100 rounded mt-1.5" />
                      </div>
                      <div className="h-3.5 w-16 bg-coffee-200 rounded" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-coffee-100">
                  {sale.items.map((item) => {
                    const devueltoPorNotas = Number(item.cantidadDevuelta ?? 0);
                    const fueDevuelto = devueltoPorNotas > 0;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p
                            className={
                              fueDevuelto
                                ? 'text-sm font-medium text-coffee-500 leading-snug truncate'
                                : 'text-sm font-medium text-coffee-900 leading-snug truncate'
                            }
                          >
                            {item.productName ?? 'Producto'}
                          </p>
                          <p className="text-xs text-coffee-500 mt-0.5">
                            {item.quantity} × {formatCurrency(item.unitPrice)}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p
                            className={
                              fueDevuelto
                                ? 'text-xs text-coffee-400 line-through leading-snug'
                                : 'text-sm font-medium text-coffee-900 leading-snug'
                            }
                          >
                            {formatCurrency(item.total)}
                          </p>
                          {fueDevuelto && (
                            <p className="text-xs font-medium inline-flex items-center gap-1 mt-0.5 text-emerald-700">
                              <RotateCcw className="h-3 w-3" />
                              {devueltoPorNotas} devuelto{devueltoPorNotas === 1 ? '' : 's'}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Sección 4 — Resumen de pago ────────────────────────────── */}
        <div className="px-5 py-4 border-b border-coffee-100">
          <SectionLabel>Resumen de pago</SectionLabel>
          <div className="grid grid-cols-2 gap-y-2 text-xs">
            <span className="text-coffee-500">Cobrado originalmente</span>
            <span className="text-coffee-900 text-right font-normal">
              {formatCurrency(sale.total)}
            </span>

            <span className="text-coffee-500 self-center">Pagado con</span>
            <span className="text-right">
              {metodosPago.length === 0 ? (
                <span className="text-coffee-400">—</span>
              ) : metodosPago.length === 1 ? (
                <span className="inline-flex items-center gap-1 rounded-lg text-xs bg-coffee-50 border border-coffee-200 px-2 py-0.5">
                  <Banknote className="h-3 w-3" />
                  {getPaymentMethodLabel(metodosPago[0].type)}
                </span>
              ) : (
                <span className="inline-flex flex-wrap justify-end gap-1">
                  {metodosPago.map((m) => (
                    <span
                      key={m.id}
                      className="inline-flex items-center gap-1 rounded-lg text-xs bg-coffee-50 border border-coffee-200 px-2 py-0.5"
                    >
                      <Banknote className="h-3 w-3" />
                      {getPaymentMethodLabel(m.type)} · {formatCurrency(m.amount)}
                    </span>
                  ))}
                </span>
              )}
            </span>

            {tieneNotas && (
              <>
                <span className="text-coffee-500">Notas de crédito emitidas</span>
                <span className="text-right font-medium text-red-700">
                  −{formatCurrency(devueltoEnNotas)}
                </span>
              </>
            )}

            {/* Divisor de cierre — ocupa las 2 columnas */}
            <div className="col-span-2 my-1 border-t border-coffee-200" />

            <span className="text-sm font-medium text-coffee-900">
              Saldo pendiente
            </span>
            <span className="text-sm font-medium text-coffee-900 text-right">
              {formatCurrency(saldoEfectivo)}
            </span>
          </div>
        </div>

        {/* ── Sección 5 — Notas de ajuste emitidas ───────────────────── */}
        {tieneNotas && (
          <div className="px-5 py-4">
            <SectionLabel>Notas de ajuste emitidas</SectionLabel>
            <div className="space-y-2.5">
              {notas.map((nota) => {
                const motivo = MOTIVO_LABEL[nota.codigoMotivoAjuste] ?? 'Ajuste';
                const esValidada =
                  (nota.estadoSiat ?? '').toLowerCase() === 'validada';
                const esAnulada =
                  (nota.estadoSiat ?? '').toLowerCase() === 'anulada';
                // El SIAT solo permite revertir UNA VEZ. Tras revertir, la nota
                // vuelve a estado Validada pero queda con `revertidaAnulacion=true`
                // y NO puede volver a anularse (el backend rechaza con 400).
                // La UI refleja esa restricción ocultando el botón "Anular en SIAT"
                // y mostrando un badge verde "Anulación revertida".
                const revertida = nota.revertidaAnulacion === true;
                const puedeAnular = esValidada && !revertida && !!onAnularNotaAjusteSiat;
                const puedeRevertir = esAnulada && !revertida && !!onRevertirAnulacionNotaAjusteSiat;
                return (
                  <div
                    key={nota.id}
                    className="rounded-lg px-3.5 py-3 grid items-start bg-coffee-50 border border-coffee-100"
                    style={{ gridTemplateColumns: 'auto 1fr auto', columnGap: '12px' }}
                  >
                    {/* Col 1: número + estado SIAT */}
                    <div>
                      <p className="text-xs font-medium text-coffee-500">
                        Nota Nº {nota.numeroNotaCreditoDebito}
                      </p>
                      {esValidada && !revertida && (
                        <p className="text-xs inline-flex items-center gap-1 mt-0.5 text-emerald-700">
                          <Check className="h-3 w-3" />
                          Validada SIAT
                        </p>
                      )}
                      {esAnulada && (
                        <p className="text-xs inline-flex items-center gap-1 mt-0.5 text-red-700">
                          <Ban className="h-3 w-3" />
                          Anulada SIAT
                        </p>
                      )}
                      {revertida && (
                        <p
                          className="text-xs inline-flex items-center gap-1 mt-0.5 text-emerald-700"
                          title="La anulación de esta nota ya fue revertida en el SIAT. No se puede volver a anular."
                        >
                          <Undo2 className="h-3 w-3" />
                          Anulación revertida
                        </p>
                      )}
                    </div>

                    {/* Col 2: motivo + fecha + acciones SIAT */}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-coffee-900 leading-snug truncate">
                        {motivo}
                      </p>
                      <p className="text-xs text-coffee-500 mt-0.5">
                        {formatDateTime(nota.fechaEmision)}
                      </p>
                      {/* Botones SIAT per-nota */}
                      {puedeAnular || puedeRevertir ? (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {puedeAnular && (
                            <button
                              onClick={() => onAnularNotaAjusteSiat!(nota)}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-600 text-white text-xs font-medium px-2 py-1 hover:bg-red-700 transition-colors"
                              title="Anular esta nota de crédito/débito en el SIAT"
                            >
                              <Ban className="h-3 w-3" /> Anular en SIAT
                            </button>
                          )}
                          {puedeRevertir && (
                            <button
                              onClick={() => onRevertirAnulacionNotaAjusteSiat!(nota)}
                              className="inline-flex items-center gap-1 rounded-lg bg-amber-600 text-white text-xs font-medium px-2 py-1 hover:bg-amber-700 transition-colors"
                              title="Revertir la anulación en el SIAT (la nota vuelve a Validada)"
                            >
                              <Undo2 className="h-3 w-3" /> Revertir anulación
                            </button>
                          )}
                        </div>
                      ) : null}
                    </div>

                    {/* Col 3: monto + IVA */}
                    <div className="text-right flex-shrink-0">
                      <p
                        className="text-sm font-medium leading-tight text-red-700"
                      >
                        −{formatCurrency(nota.montoTotalDevuelto)}
                      </p>
                      <p className="text-xs text-coffee-500 mt-0.5">
                        IVA {formatCurrency(nota.montoEfectivoCreditoDebito)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Acciones SIAT (footer operativo) ── */}
        {sale.ventaId && (
          <div className="px-5 py-4 border-t border-coffee-100 bg-coffee-50/50">
            <SectionLabel>Acciones SIAT</SectionLabel>
            <div className="flex flex-wrap gap-2">
            {sale.siatAceptada && onOpenFacturaModal && (
              <button
                onClick={() => onOpenFacturaModal()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium px-3 py-1.5 hover:bg-emerald-700 transition-colors"
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
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium px-3 py-1.5 hover:bg-blue-700 transition-colors"
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
                  className="inline-flex items-center gap-1.5 rounded-lg text-xs font-medium px-3 py-1.5 bg-yellow-100 text-yellow-700"
                  title="El saldo de la venta fue agotado por notas de ajuste válidas."
                >
                  <ScrollText className="h-3.5 w-3.5" /> Saldo agotado
                </span>
              )}
            {!sale.siatAceptada &&
              !esEstadoAnuladaSiat(sale.estadoSiat) &&
              onFacturarSinFacturar && (
                <button
                  onClick={() => onFacturarSinFacturar(sale.ventaId!)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 text-white text-xs font-medium px-3 py-1.5 hover:bg-amber-700 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {!sale.facturado ? 'Facturar' : 'Corregir y reenviar al SIAT'}
                </button>
              )}
            {sale.siatAceptada &&
              !esEstadoAnuladaSiat(sale.estadoSiat) &&
              !sale.revertidaAnulacion &&
              onAnularSiat &&
              (() => {
                // ── Cascada obligatoria: anular notas antes que la factura ──
                // Si la venta tiene notas activas (cualquier estado ≠ Anulada:
                // Validada, Pendiente, Observada), el botón de anular factura
                // queda deshabilitado con un tooltip explicativo. El usuario
                // debe anular primero cada nota desde su fila y solo después
                // se habilita este botón. El backend refuerza la regla.
                const notasActivasCount = notas.filter(
                  (n) =>
                    (n.estadoSiat ?? '').toLowerCase() !== 'anulada',
                ).length;
                const bloqueadaPorNotas = notasActivasCount > 0;

                return (
                  <button
                    onClick={() => {
                      if (bloqueadaPorNotas) {
                        toast.warning(
                          'Anulá las notas primero',
                          `La factura tiene ${notasActivasCount} nota(s) de ajuste vinculada(s). `
                            + 'Anulá cada nota antes de anular la factura en el SIAT.',
                        );
                        return;
                      }
                      onAnularSiat(sale.ventaId!);
                    }}
                    disabled={bloqueadaPorNotas}
                    className={
                      bloqueadaPorNotas
                        ? 'inline-flex items-center gap-1.5 rounded-lg bg-coffee-200 text-coffee-500 text-xs font-medium px-3 py-1.5 cursor-not-allowed'
                        : 'inline-flex items-center gap-1.5 rounded-lg bg-red-600 text-white text-xs font-medium px-3 py-1.5 hover:bg-red-700 transition-colors'
                    }
                    title={
                      bloqueadaPorNotas
                        ? `Anulá primero las ${notasActivasCount} nota(s) de ajuste vinculada(s). `
                          + 'Solo después podés anular la factura.'
                        : 'Anular la factura en el SIAT'
                    }
                  >
                    <Ban className="h-3.5 w-3.5" /> Anular en SIAT
                    {bloqueadaPorNotas && (
                      <span className="ml-0.5 inline-flex items-center justify-center rounded-full bg-coffee-300 text-coffee-700 text-[10px] font-semibold px-1.5">
                        {notasActivasCount}
                      </span>
                    )}
                  </button>
                );
              })()}
            {sale.siatAceptada &&
              !esEstadoAnuladaSiat(sale.estadoSiat) &&
              sale.revertidaAnulacion && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium px-3 py-1.5"
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
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 text-white text-xs font-medium px-3 py-1.5 hover:bg-amber-700 transition-colors"
                  title="Revertir la anulación en el SIAT (la factura vuelve a Validada)"
                >
                  <Undo2 className="h-3.5 w-3.5" /> Revertir anulación
                </button>
              )}
            {esEstadoAnuladaSiat(sale.estadoSiat) && sale.revertidaAnulacion && (
              <span
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium px-3 py-1.5"
                title="La anulación ya fue revertida en el SIAT."
              >
                <Undo2 className="h-3.5 w-3.5" /> Reversión aplicada
              </span>
            )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};