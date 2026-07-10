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
  Receipt,
  ScrollText,
  ChevronDown,
} from 'lucide-react';
import { formatCurrency, getPaymentMethodLabel } from '../../utils';

interface SalesTableProps {
  sales: Sale[];
  onView?: (sale: Sale) => void;
  onRefund?: (sale: Sale) => void;
  /**
   * Click en la opción "Imprimir comanda" del dropdown de la fila.
   * Si la venta no tiene items para comanda, este callback puede omitirse.
   */
  onPrint?: (sale: Sale) => void;
  /**
   * Click en la opción "Imprimir factura SIAT" del dropdown de la fila.
   * Sólo se muestra si `sale.siatAceptada && sale.numeroFactura != null`.
   */
  onPrintFacturaSiat?: (sale: Sale) => void;
  isLoading?: boolean;
}

const formatDate = (date: Date) =>
  format(new Date(date), 'dd MMM yyyy HH:mm', { locale: es });
const formatDateShort = (date: Date) =>
  format(new Date(date), 'dd MMM · HH:mm', { locale: es });

// ── Helpers de estado visual ─────────────────────────────────────────────

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface EstadoBadgeInfo {
  label: string;
  variant: BadgeVariant;
}

/** Mapea el estado de la venta al badge del design system (`Badge`). */
function getEstadoBadge(sale: Sale): EstadoBadgeInfo {
  if (sale.status === 'refunded') {
    return { label: 'Reembolsado', variant: 'danger' };
  }
  if (sale.status === 'partially_refunded') {
    return { label: 'Con notas', variant: 'warning' };
  }
  if (esEstadoAnuladaSiat(sale.estadoSiat)) {
    return { label: 'Sin factura', variant: 'default' };
  }
  if (esEstadoValidadaSiat(sale.estadoSiat) && sale.numeroFactura != null) {
    return { label: 'Facturada', variant: 'info' };
  }
  return { label: 'Completada', variant: 'success' };
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

/** Píldora de estado — reusa el `Badge` compartido del design system. */
const EstadoBadge: React.FC<{ info: EstadoBadgeInfo }> = ({ info }) => (
  <Badge variant={info.variant} size="sm">
    {info.label}
  </Badge>
);

/** Celda de código. */
const CodigoCell: React.FC<{ sale: Sale }> = ({ sale }) => {
  return (
    <td className="px-6 py-2.5 whitespace-nowrap align-middle">
      <span className="font-mono text-sm font-medium text-coffee-900">
        {sale.code}
      </span>
    </td>
  );
};

/** Celda TOTAL con lógica de tachado + saldo + chip de notas. */
const TotalCell: React.FC<{ sale: Sale }> = ({ sale }) => {
  const notas = sale.notasAjuste ?? [];
  // Solo notas VÁLIDAS impactan el saldo (las anuladas no representan
  // dinero devuelto; se siguen mostrando en el modal de detalle).
  const tieneNotas = notas.some(
    (n) => (n.estadoSiat ?? '').toLowerCase() === 'validada',
  );
  const devuelto = sale.montoNotasAjuste ?? 0;
  const saldo = Math.max(0, sale.total - devuelto);

  if (!tieneNotas) {
    return (
      <td className="px-6 py-2.5 whitespace-nowrap align-middle">
        <span className="text-sm font-medium text-coffee-900">
          {formatCurrency(sale.total)}
        </span>
      </td>
    );
  }

  return (
    <td className="px-6 py-2.5 align-middle">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-coffee-900">
          Saldo: {formatCurrency(saldo)}
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-coffee-500">
          <Receipt className="h-3 w-3 flex-shrink-0" />
          {formatCurrency(sale.total)} · {notas.length} {notas.length === 1 ? 'nota' : 'notas'}
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
  onRefund?: (sale: Sale) => void;
  onPrint?: (sale: Sale) => void;
  onPrintFacturaSiat?: (sale: Sale) => void;
}> = ({ sale, onView, onRefund, onPrint, onPrintFacturaSiat }) => {
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
        <PrintMenuDropdown
          sale={sale}
          onPrint={onPrint}
          onPrintFacturaSiat={onPrintFacturaSiat}
        />
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

/**
 * Dropdown "Imprimir" con dos opciones:
 * - Imprimir comanda (siempre, si hay `onPrint`)
 * - Imprimir factura SIAT (sólo si la venta fue facturada y validada)
 *
 * Implementación: un único `openPrintMenuId` por tabla coordina qué fila
 * tiene el menú abierto. Click-outside cierra el menú.
 */
const PrintMenuDropdown: React.FC<{
  sale: Sale;
  onPrint?: (sale: Sale) => void;
  onPrintFacturaSiat?: (sale: Sale) => void;
}> = ({ sale, onPrint, onPrintFacturaSiat }) => {
  const [openPrintMenuId, setOpenPrintMenuId] = React.useState<string | null>(null);

  const showFactura =
    !!sale.siatAceptada && sale.numeroFactura != null && !!onPrintFacturaSiat;
  const hasOptions = !!onPrint || showFactura;

  // Click-outside para cerrar
  React.useEffect(() => {
    if (openPrintMenuId !== sale.id) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest(`[data-print-menu-anchor="${sale.id}"]`)) {
        setOpenPrintMenuId(null);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [openPrintMenuId, sale.id]);

  if (!hasOptions) return null;

  const isOpen = openPrintMenuId === sale.id;

  return (
    <div
      className="relative"
      data-print-menu-anchor={sale.id}
    >
      <button
        className="p-1.5 rounded-lg text-coffee-400 hover:text-coffee-900 hover:bg-coffee-50 transition-colors flex items-center gap-0.5"
        onClick={() => setOpenPrintMenuId(isOpen ? null : sale.id)}
        title="Imprimir"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <Printer className="h-4 w-4" />
        <ChevronDown className="h-3 w-3" />
      </button>
      {isOpen && (
        <div
          className="absolute right-0 mt-1 z-20 bg-white border border-coffee-200 rounded-lg shadow-xl w-52 py-1"
          role="menu"
        >
          {onPrint && (
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-coffee-800 hover:bg-coffee-50 transition-colors text-left"
              onClick={() => { onPrint(sale); setOpenPrintMenuId(null); }}
              role="menuitem"
            >
              <Printer className="h-4 w-4 flex-shrink-0 text-coffee-600" />
              <span>Imprimir comanda</span>
            </button>
          )}
          {showFactura && (
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-coffee-800 hover:bg-emerald-50 transition-colors text-left border-t border-coffee-100"
              onClick={() => { onPrintFacturaSiat!(sale); setOpenPrintMenuId(null); }}
              role="menuitem"
            >
              <ScrollText className="h-4 w-4 flex-shrink-0 text-emerald-600" />
              <span>Imprimir factura SIAT</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ── Componente principal ────────────────────────────────────────────────

export const SalesTable: React.FC<SalesTableProps> = ({
  sales,
  onView,
  onRefund,
  onPrint,
  onPrintFacturaSiat,
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
            const badge = getEstadoBadge(sale);
            const cliente = getClienteLabel(sale);
            const reversible = esReversible(sale);
            const notas = sale.notasAjuste ?? [];
            // Solo notas VÁLIDAS para el cálculo del saldo (las anuladas ya
            // no son devoluciones efectivas; se ven en el modal de detalle).
            const tieneNotas = notas.some(
              (n) => (n.estadoSiat ?? '').toLowerCase() === 'validada',
            );
            const devuelto = sale.montoNotasAjuste ?? 0;
            const saldo = Math.max(0, sale.total - devuelto);
            return (
              <div key={sale.id} className="px-4 py-4 space-y-2">
                {/* Fila 1: código + estado */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-medium text-coffee-900">
                    {sale.code}
                  </span>
                  <EstadoBadge info={badge} />
                </div>

                {/* Fila 2: cliente */}
                <p
                  className={clsx(
                    'text-sm',
                    cliente.esAnonimo
                      ? 'text-coffee-400 italic'
                      : 'text-coffee-800',
                  )}
                >
                  {cliente.text}
                </p>

                {/* Fila 3: fecha + pago */}
                <div className="flex items-center justify-between gap-2 text-xs text-coffee-500">
                  <span>{formatDateShort(sale.date)}</span>
                  <span>
                    {sale.paymentMethods?.map((m) => getPaymentMethodLabel(m.type)).join(' + ') || 'N/A'}
                  </span>
                </div>

                {/* Fila 4: total (con saldo + notas si aplica) */}
                <div className="flex flex-col gap-0.5">
                  {tieneNotas ? (
                    <>
                      <span className="text-sm font-medium text-coffee-900">
                        Saldo: {formatCurrency(saldo)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-coffee-500">
                        <Receipt className="h-3 w-3 flex-shrink-0" />
                        {formatCurrency(sale.total)} · {notas.length} {notas.length === 1 ? 'nota' : 'notas'}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm font-medium text-coffee-900">
                      {formatCurrency(sale.total)}
                    </span>
                  )}
                </div>

                {/* Fila 5: acciones */}
                <div className="flex gap-1 pt-1 flex-wrap">
                  {onView && (
                    <button
                      onClick={() => onView(sale)}
                      className="flex-1 min-w-[60px] flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-coffee-200 text-coffee-600 hover:bg-coffee-50 text-xs font-medium transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" /> Ver
                    </button>
                  )}
                  {onPrint && (
                    <button
                      onClick={() => onPrint(sale)}
                      className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-coffee-200 text-coffee-600 hover:bg-coffee-50 text-xs font-medium transition-colors"
                    >
                      <Printer className="h-3.5 w-3.5" /> Comanda
                    </button>
                  )}
                  {onPrintFacturaSiat && sale.siatAceptada && sale.numeroFactura != null && (
                    <button
                      onClick={() => onPrintFacturaSiat(sale)}
                      className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs font-medium transition-colors"
                    >
                      <ScrollText className="h-3.5 w-3.5" /> Factura
                    </button>
                  )}
                  {onRefund && reversible && (
                    <button
                      onClick={() => onRefund(sale)}
                      className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 text-xs font-medium transition-colors"
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
                    className="px-6 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider"
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
                const badge = getEstadoBadge(sale);
                return (
                  <tr
                    key={sale.id}
                    className="border-b border-coffee-100 hover:bg-coffee-50/40 transition-colors"
                  >
                    <CodigoCell sale={sale} />
                    <td className="px-6 py-2.5 whitespace-nowrap align-middle">
                      <span className="text-sm text-coffee-700">
                        {formatDate(sale.date)}
                      </span>
                    </td>
                    <ClienteCell sale={sale} />
                    <td className="px-6 py-2.5 whitespace-nowrap align-middle">
                      <Badge variant="info" size="sm">
                        {sale.items.length} items
                      </Badge>
                    </td>
                    <TotalCell sale={sale} />
                    <td className="px-6 py-2.5 whitespace-nowrap align-middle">
                      <span className="text-sm text-coffee-600">
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
                      onRefund={onRefund}
                      onPrint={onPrint}
                      onPrintFacturaSiat={onPrintFacturaSiat}
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
