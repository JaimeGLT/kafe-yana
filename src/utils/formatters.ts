/**
 * Rounds a monetary amount to 2 decimals, avoiding floating-point noise
 * (e.g. 45.900000000000006) before sending totals to the backend, which
 * compares against clean `decimal` values.
 */
export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Formats a number as Bolivianos currency.
 * Example: 1234.5 → "Bs 1.234,50"
 */
export function formatCurrency(amount: number): string {
  return `Bs ${amount.toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Formats a date to short Spanish locale string.
 * Example: "15 ene 2024"
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const utc = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return utc.toLocaleDateString('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const BOLIVIA_TZ = 'America/La_Paz';

/**
 * Formats only the time in Bolivia's timezone, regardless of the device's
 * own timezone/clock settings. Example: "14:30".
 */
export function formatHoraBolivia(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('es-BO', {
    timeZone: BOLIVIA_TZ,
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formats date+time in Bolivia's timezone, regardless of the device's own
 * timezone/clock settings. Example: "05/07/2026, 14:30".
 */
export function formatFechaHoraBolivia(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('es-BO', {
    timeZone: BOLIVIA_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formats a date+time to short Spanish locale string.
 * Example: "15 ene 2024, 14:30"
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Formats a date as a relative time string in Spanish.
 * Example: "Hace 5 min", "Hace 2 horas", "Hace 3 días"
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSec < 60) return 'Hace un momento';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffHrs < 24) return `Hace ${diffHrs} ${diffHrs === 1 ? 'hora' : 'horas'}`;
  if (diffDays < 7) return `Hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
  if (diffWeeks < 5) return `Hace ${diffWeeks} ${diffWeeks === 1 ? 'semana' : 'semanas'}`;
  return `Hace ${diffMonths} ${diffMonths === 1 ? 'mes' : 'meses'}`;
}

/**
 * Formats a decimal value as a percentage string.
 * Example: 0.18 → "18%"  or  18 → "18%"
 */
export function formatPercent(value: number): string {
  const pct = value > 1 ? value : value * 100;
  return `${Math.round(pct)}%`;
}

/**
 * Formats a number with thousand separators.
 * Example: 1234 → "1,234"
 */
export function formatNumber(value: number): string {
  return value.toLocaleString('es-BO');
}

/**
 * Returns the stock status based on current stock vs minimum stock threshold.
 */
export function getStockStatus(
  stock: number,
  minStock: number
): 'ok' | 'low' | 'out' {
  if (stock <= 0) return 'out';
  if (stock <= minStock) return 'low';
  return 'ok';
}

/**
 * Formats a stock quantity for display. Non-finite numbers (Infinity/-Infinity/NaN)
 * render as the infinity symbol, since the POS uses Infinity as a sentinel for
 * "unlimited" stock (e.g. productos sin receta).
 * Example: 12 → "12",  Infinity → "∞"
 */
export function formatStockQty(value: number): string {
  return Number.isFinite(value) ? value.toString() : '∞';
}

/**
 * Returns a human-readable Spanish label for common status strings.
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    // Generic
    active: 'Activo',
    inactive: 'Inactivo',
    pending: 'Pendiente',
    completed: 'Completado',
    cancelled: 'Cancelado',
    approved: 'Aprobado',
    rejected: 'Rechazado',
    // Sale / order statuses
    draft: 'Borrador',
    partial: 'Parcial',
    received: 'Recibido',
    // Payment statuses
    paid: 'Pagado',
    overdue: 'Vencido',
    // Stock
    ok: 'Stock OK',
    low: 'Stock Bajo',
    out: 'Agotado',
  };
  return labels[status] ?? status;
}

/**
 * Returns a human-readable Spanish label for payment method strings.
 */
export function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    cash: 'Efectivo',
    card: 'Tarjeta',
    transfer: 'QR',
    qr: 'QR',
    credit: 'Crédito',
    mixed: 'Pago mixto',
    check: 'Cheque',
    yape: 'Yape',
    plin: 'Plin',
  };
  return labels[method] ?? method;
}
