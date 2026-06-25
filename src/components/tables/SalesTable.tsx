import React from 'react';
import { clsx } from 'clsx';
import type { Sale } from '../../types';
import { esEstadoAnuladaSiat, esEstadoValidadaSiat } from '../../types/siat';
import { Badge } from '../ui';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Eye,
  Printer,
  RotateCcw,
  FileCheck,
  Receipt,
  ScrollText,
} from 'lucide-react';
import { formatCurrency, getPaymentMethodLabel } from '../../utils';

interface SalesTableProps {
  sales: Sale[];
  onView?: (sale: Sale) => void;
  onInvoice?: (sale: Sale) => void;
  onRefund?: (sale: Sale) => void;
  onPrint?: (sale: Sale) => void;
  isLoading?: boolean;
}

const formatDate = (date: Date) =>
  format(new Date(date), 'dd MMM yyyy HH:mm', { locale: es });
const formatDateShort = (date: Date) =>
  format(new Date(date), 'dd MMM · HH:mm', { locale: es });

// ── Helpers de estado visual ─────────────────────────────────────────────

type EstadoBarra = 'roja' | 'ambar' | 'azul';

const BARRA_COLORS: Record<EstadoBarra, string> = {
  roja: '#A32D2D',
  ambar: '#BA7517',
  azul: '#378ADD',
};

/**
 * Color de la barra lateral de la fila. Prioridad de la señal más fuerte:
 * - roja:   venta reembolsada o totalmente devuelta por notas
 * - ambar:  venta con notas de ajuste parciales
 * - azul:   venta facturada y validada en SIAT (sin notas)
 * - null:   venta normal sin factura y sin notas
 */
function getBarraLateral(sale: Sale): EstadoBarra | null {
  // Reembolsada: señal más extrema.
  if (sale.status === 'refunded' || sale.status === 'partially_refunded') {
    return 'roja';
  }
  const tieneNotas = (sale.notasAjuste?.length ?? 0) > 0;
  if (tieneNotas) {
    const devuelto = sale.montoNotasAjuste ?? 0;
    const saldo = Math.max(0, sale.total - devuelto);
    if (saldo <= 0) return 'roja';
    return 'ambar';
  }
  // Sin notas: marcamos azul si tiene factura SIAT validada.
  if (esEstadoValidadaSiat(sale.estadoSiat) && sale.numeroFactura != null) {
    return 'azul';
  }
  return null;
}

interface EstadoBadgeInfo {
  label: string;
  bg: string;
  color: string;
  border: string;
}

/** Mapea el estado de la venta al badge del spec. */
function getEstadoBadge(sale: Sale): EstadoBadgeInfo {
  if (sale.status === 'refunded') {
    return { label: 'Reembolsado', bg: '#FCEBEB', color: '#791F1F', border: '#E24B4A' };
  }
  if (sale.status === 'partially_refunded') {
    return { label: 'Con notas', bg: '#FAEEDA', color: '#633806', border: '#EF9F27' };
  }
  if (esEstadoAnuladaSiat(sale.estadoSiat)) {
    return { label: 'Sin factura', bg: '#F1EFE8', color: '#444441', border: '#888780' };
  }
  return { label: 'Completado', bg: '#EAF3DE', color: '#27500A', border: '#639922' };
}

/** Etiqueta del cliente — unifica "Sin nombre" y "Cliente General" como anónimo. */
function getClienteLabel(sale: Sale): { text: string; esAnonimo: boolean } {
  if (
    !sale.customerName ||
    sale.customerName === 'Cliente General' ||
    sale.customerName === 'Sin nombre' ||
    sale.customerName === 'Anónimo'
  ) {
    return { text: '— Sin cliente —', esAnonimo: true };
  }
  return { text: sale.customerName, esAnonimo: false };
}

/** Indica si la venta todavía es elegible para reembolso. */
function esReversible(sale: Sale): boolean {
  if (sale.status === 'refunded' || sale.status === 'partially_refunded') return false;
  if (esEstadoAnuladaSiat(sale.estadoSiat)) return false;
  return true;
}

// ── Componentes reutilizables ────────────────────────────────────────────

/** Píldora de estado con los colores exactos del spec. */
const EstadoBadge: React.FC<{ info: EstadoBadgeInfo }> = ({ info }) => (
  <span
    className="inline-block text-[11px] font-medium whitespace-nowrap"
    style={{
      backgroundColor: info.bg,
      color: info.color,
      border: `1px solid ${info.border}`,
      padding: '3px 10px',
      borderRadius: '20px',
    }}
  >
    {info.label}
  </span>
);

/** Celda de código con barra lateral opcional + badge azul de factura SIAT. */
const CodigoCell: React.FC<{
  sale: Sale;
  barraColor: string | null;
}> = ({ sale, barraColor }) => {
  const validadaSiat =
    esEstadoValidadaSiat(sale.estadoSiat) && sale.numeroFactura != null;
  return (
    <td className="relative px-6 py-2.5 whitespace-nowrap align-middle" style={{ position: 'relative' }}>
      {barraColor && (
        <div
          aria-hidden
          className="absolute left-0 top-0 bottom-0"
          style={{ width: '3px', backgroundColor: BARRA_COLORS[barraColor as EstadoBarra] }}
        />
      )}
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[13px] font-medium text-coffee-900">
          {sale.code}
        </span>
        {validadaSiat && (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium whitespace-nowrap"
            style={{
              backgroundColor: '#E6F1FB',
              color: '#0C447C',
              border: '1px solid #378ADD',
              padding: '3px 10px',
              borderRadius: '20px',
            }}
          >
            <FileCheck className="h-3.5 w-3.5 flex-shrink-0" />
            N° {sale.numeroFactura}
          </span>
        )}
      </div>
    </td>
  );
};

/** Celda TOTAL con lógica de tachado + saldo + chip de notas. */
const TotalCell: React.FC<{ sale: Sale }> = ({ sale }) => {
  const notas = sale.notasAjuste ?? [];
  const tieneNotas = notas.length > 0;
  const devuelto = sale.montoNotasAjuste ?? 0;
  const saldo = Math.max(0, sale.total - devuelto);

  if (!tieneNotas) {
    return (
      <td className="px-6 py-2.5 whitespace-nowrap align-middle">
        <span className="text-[14px] font-medium text-coffee-900">
          {formatCurrency(sale.total)}
        </span>
      </td>
    );
  }

  return (
    <td className="px-6 py-1.5 align-middle">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-baseline gap-2 whitespace-nowrap">
          <span className="text-[13px] text-coffee-500 line-through">
            {formatCurrency(sale.total)}
          </span>
          <span className="text-[14px] font-medium text-coffee-900">
            Saldo: {formatCurrency(saldo)}
          </span>
        </div>
        <span
          className="inline-flex items-center gap-1 self-start text-[12px] font-medium whitespace-nowrap"
          style={{
            backgroundColor: '#FAEEDA',
            color: '#633806',
            border: '1px solid #EF9F27',
            padding: '3px 10px',
            borderRadius: '20px',
          }}
        >
          <Receipt className="h-3.5 w-3.5 flex-shrink-0" />
          {notas.length} {notas.length === 1 ? 'nota' : 'notas'}
        </span>
      </div>
    </td>
  );
};

/** Celda de cliente con "— Sin cliente —" en gris itálico. */
const ClienteCell: React.FC<{ sale: Sale }> = ({ sale }) => {
  const { text, esAnonimo } = getClienteLabel(sale);
  return (
    <td className="px-6 py-2.5 align-middle">
      <span
        className={clsx(
          'text-coffee-900',
          esAnonimo && 'text-coffee-400 italic',
        )}
      >
        {text}
      </span>
    </td>
  );
};

/** Celda de acciones con íconos gris→primario en hover. */
const AccionesCell: React.FC<{
  sale: Sale;
  onView?: (sale: Sale) => void;
  onInvoice?: (sale: Sale) => void;
  onRefund?: (sale: Sale) => void;
  onPrint?: (sale: Sale) => void;
}> = ({ sale, onView, onInvoice, onRefund, onPrint }) => {
  const reversible = esReversible(sale);
  const iconBtn =
    'p-1.5 rounded-lg text-coffee-400 hover:text-coffee-900 hover:bg-coffee-50 transition-colors';
  return (
    <td className="px-6 py-2.5 whitespace-nowrap align-middle">
      <div className="flex items-center justify-end gap-1">
        {onView && (
          <button
            className={iconBtn}
            onClick={() => onView(sale)}
            title="Ver detalle"
          >
            <Eye className="h-4 w-4" />
          </button>
        )}
        {onPrint && (
          <button
            className={iconBtn}
            onClick={() => onPrint(sale)}
            title="Imprimir comanda"
          >
            <Printer className="h-4 w-4" />
          </button>
        )}
        {onInvoice && reversible && (
          <button
            className={iconBtn}
            onClick={() => onInvoice(sale)}
            title="Factura"
          >
            <ScrollText className="h-4 w-4" />
          </button>
        )}
        {onRefund && reversible && (
          <button
            className={iconBtn}
            onClick={() => onRefund(sale)}
            title="Reembolso"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
      </div>
    </td>
  );
};

// ── Componente principal ────────────────────────────────────────────────

export const SalesTable: React.FC<SalesTableProps> = ({
  sales,
  onView,
  onInvoice,
  onRefund,
  onPrint,
  isLoading = false,
}) => {
  return (
    <div className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden">

      {/* ── Mobile: cards ───────────────────────────────────────────── */}
      <div className="sm:hidden divide-y divide-coffee-100">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-4 py-4 space-y-2 animate-pulse">
              <div className="flex justify-between">
                <div className="h-3 w-20 bg-coffee-200 rounded" />
                <div className="h-4 w-16 bg-coffee-100 rounded" />
              </div>
              <div className="h-4 w-40 bg-coffee-200 rounded" />
              <div className="h-3 w-28 bg-coffee-100 rounded" />
            </div>
          ))
        ) : sales.length === 0 ? (
          <div className="py-12 text-center text-coffee-500 text-sm">
            No hay ventas registradas
          </div>
        ) : (
          sales.map((sale) => {
            const barra = getBarraLateral(sale);
            const badge = getEstadoBadge(sale);
            const cliente = getClienteLabel(sale);
            const reversible = esReversible(sale);
            const notas = sale.notasAjuste ?? [];
            const tieneNotas = notas.length > 0;
            const devuelto = sale.montoNotasAjuste ?? 0;
            const saldo = Math.max(0, sale.total - devuelto);
            const validadaSiat =
              esEstadoValidadaSiat(sale.estadoSiat) && sale.numeroFactura != null;
            return (
              <div
                key={sale.id}
                className="relative px-4 py-4 space-y-2"
                style={barra ? { position: 'relative' } : undefined}
              >
                {barra && (
                  <div
                    aria-hidden
                    className="absolute left-0 top-0 bottom-0"
                    style={{ width: '3px', backgroundColor: BARRA_COLORS[barra] }}
                  />
                )}

                {/* Fila 1: código + (badge factura) + estado */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[13px] font-medium text-coffee-900">
                      {sale.code}
                    </span>
                    {validadaSiat && (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-medium whitespace-nowrap"
                        style={{
                          backgroundColor: '#E6F1FB',
                          color: '#0C447C',
                          border: '1px solid #378ADD',
                          padding: '3px 10px',
                          borderRadius: '20px',
                        }}
                      >
                        <FileCheck className="h-3.5 w-3.5 flex-shrink-0" />
                        N° {sale.numeroFactura}
                      </span>
                    )}
                  </div>
                  <EstadoBadge info={badge} />
                </div>

                {/* Fila 2: cliente */}
                <p
                  className={clsx(
                    'text-[13px]',
                    cliente.esAnonimo
                      ? 'text-coffee-400 italic'
                      : 'text-coffee-800',
                  )}
                >
                  {cliente.text}
                </p>

                {/* Fila 3: fecha + pago */}
                <div className="flex items-center justify-between gap-2 text-[12px] text-coffee-500">
                  <span>{formatDateShort(sale.date)}</span>
                  <span>
                    {sale.paymentMethods?.map((m) => getPaymentMethodLabel(m.type)).join(' + ') || 'N/A'}
                  </span>
                </div>

                {/* Fila 4: total (con tachado+saldo+chip si hay notas) */}
                <div className="flex flex-col gap-1">
                  {tieneNotas ? (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-[13px] text-coffee-500 line-through">
                          {formatCurrency(sale.total)}
                        </span>
                        <span className="text-[14px] font-medium text-coffee-900">
                          Saldo: {formatCurrency(saldo)}
                        </span>
                      </div>
                      <span
                        className="inline-flex items-center gap-1 self-start text-[12px] font-medium whitespace-nowrap"
                        style={{
                          backgroundColor: '#FAEEDA',
                          color: '#633806',
                          border: '1px solid #EF9F27',
                          padding: '3px 10px',
                          borderRadius: '20px',
                        }}
                      >
                        <Receipt className="h-3.5 w-3.5 flex-shrink-0" />
                        {notas.length} {notas.length === 1 ? 'nota' : 'notas'}
                      </span>
                    </>
                  ) : (
                    <span className="text-[14px] font-medium text-coffee-900">
                      {formatCurrency(sale.total)}
                    </span>
                  )}
                </div>

                {/* Fila 5: acciones */}
                <div className="flex gap-1 pt-1">
                  {onView && (
                    <button
                      onClick={() => onView(sale)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-coffee-200 text-coffee-600 hover:bg-coffee-50 text-[12px] font-medium transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" /> Ver
                    </button>
                  )}
                  {onPrint && (
                    <button
                      onClick={() => onPrint(sale)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-coffee-200 text-coffee-600 hover:bg-coffee-50 text-[12px] font-medium transition-colors"
                    >
                      <Printer className="h-3.5 w-3.5" /> Comanda
                    </button>
                  )}
                  {onRefund && reversible && (
                    <button
                      onClick={() => onRefund(sale)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 text-[12px] font-medium transition-colors"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Reembolso
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Desktop: tabla ──────────────────────────────────────────── */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-coffee-100">
          <thead className="bg-coffee-50">
            <tr>
              {['Código', 'Fecha', 'Cliente', 'Productos', 'Total', 'Pago', 'Estado', ''].map(
                (h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-[11px] font-medium text-coffee-600 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-coffee-500" />
                  </div>
                </td>
              </tr>
            ) : sales.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-coffee-500">
                  No hay ventas registradas
                </td>
              </tr>
            ) : (
              sales.map((sale) => {
                const barra = getBarraLateral(sale);
                const badge = getEstadoBadge(sale);
                return (
                  <tr
                    key={sale.id}
                    className="border-b border-coffee-100 hover:bg-coffee-50/40 transition-colors"
                  >
                    <CodigoCell sale={sale} barraColor={barra} />
                    <td className="px-6 py-2.5 whitespace-nowrap align-middle">
                      <span className="text-[13px] text-coffee-700">
                        {formatDate(sale.date)}
                      </span>
                    </td>
                    <ClienteCell sale={sale} />
                    <td className="px-6 py-2.5 whitespace-nowrap align-middle">
                      <Badge variant="info" size="sm">
                        {(sale.items as unknown[]).length} items
                      </Badge>
                    </td>
                    <TotalCell sale={sale} />
                    <td className="px-6 py-2.5 whitespace-nowrap align-middle">
                      <span className="text-[13px] text-coffee-600">
                        {sale.paymentMethods
                          ?.map((m) => getPaymentMethodLabel(m.type))
                          .join(' + ') || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-2.5 whitespace-nowrap align-middle">
                      <EstadoBadge info={badge} />
                    </td>
                    <AccionesCell
                      sale={sale}
                      onView={onView}
                      onInvoice={onInvoice}
                      onRefund={onRefund}
                      onPrint={onPrint}
                    />
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
