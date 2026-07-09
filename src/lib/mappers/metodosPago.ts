/**
 * Mappers entre el `PaymentMethodType` (string legacy del frontend) y el
 * código SIN numérico del catálogo `CatMetodosPago`.
 *
 * El string type se mantiene porque cambiar el contrato de `PaymentMethodType`
 * tocaría otros lugares del frontend (e.g. `ReviewPanel`, `sales.ts`). El mapeo
 * se concentra acá y se aplica únicamente en el momento de serializar el body
 * del cobro a `DtoPagos.Lineas[].CodigoMetodoPago`.
 *
 * Reglas:
 *   - `'cash'`     → 1 (EFECTIVO)         — seed Activo=true en el server.
 *   - `'transfer'` → 7 (TRANSFERENCIA BANCARIA — alias QR en KafeYana) — seed Activo=true.
 *   - `'qr'`       → 7 (alias legacy)      — seed Activo=true.
 *   - `'card'`     → 2 (TARJETA)          — seed Activo=true en el server.
 *   - `'credit'`   → 5 (OTROS)            — Activo=false por default (categoría genérica para crédito / otros).
 *   - `'mixed'`    → 5 (OTROS)            — solo se usa cuando el cobro se divide en varias líneas.
 *
 * Si el operador activa/desactiva métodos desde un panel admin (futuro), el
 * catálogo del server es la fuente de verdad. Este mapper solo traduce la
 * intención del cajero al código SIN.
 */

import type { PaymentMethodType } from '../../types';

/**
 * Códigos SIN oficiales (jun-2026) — espejo del enum `TipoPagos` del backend.
 *
 * Mantener sincronizado con `KafeYana.Core/TiposDeDatos/TipoPagos.cs`.
 */
export const SIN_CODIGO = {
  EFECTIVO: 1,
  TARJETA: 2,
  OTROS: 5,
  TRANSFERENCIA: 7,
} as const;

/**
 * Devuelve el código SIN del método de pago del frontend.
 *
 * @throws si el método es desconocido (defensa contra typos / strings nuevos).
 */
export function mapPaymentMethodToSinCode(method: PaymentMethodType): number {
  switch (method) {
    case 'cash':
      return SIN_CODIGO.EFECTIVO;
    case 'transfer':
    case 'qr':
      return SIN_CODIGO.TRANSFERENCIA;
    case 'card':
      return SIN_CODIGO.TARJETA;
    case 'credit':
    case 'mixed':
      return SIN_CODIGO.OTROS;
    default: {
      // Exhaustividad: si se agrega un método nuevo al type, esto falla en build.
      const _exhaustive: never = method;
      throw new Error(`PaymentMethodType desconocido: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Inversa de `mapPaymentMethodToSinCode`. Se usa al DERIVAR los métodos de
 * pago de una venta persistida (historial / reportes / detalle) a partir del
 * código SIN que expone el backend en `Venta.CodigoMetodoPago` y/o en cada
 * `VentaPago.CodigoMetodoPago`.
 *
 * Reglas:
 *   - 1  → 'cash'      (EFECTIVO)
 *   - 2  → 'card'      (TARJETA)
 *   - 5  → 'credit'    (OTROS — categoría genérica)
 *   - 7  → 'transfer'  (TRANSFERENCIA — alias QR en KafeYana)
 *   - default → 'cash' (defensa: códigos nuevos del SIN caen a efectivo para
 *     no romper render del historial)
 *
 * No lanza excepción: el backend puede recibir códigos nuevos del SIN
 * (catálogo semanal) antes que este mapper se actualice.
 */
export function sinCodeToPaymentType(codigo: number): PaymentMethodType {
  switch (codigo) {
    case SIN_CODIGO.EFECTIVO:
      return 'cash';
    case SIN_CODIGO.TARJETA:
      return 'card';
    case SIN_CODIGO.OTROS:
      return 'credit';
    case SIN_CODIGO.TRANSFERENCIA:
      return 'transfer';
    case 32: // legacy: código Qr previo al bugfix jun-2026 (ver TipoPagos.cs)
      return 'transfer';
    default:
      return 'cash';
  }
}

/**
 * Indica si un código SIN corresponde a un método de pago "digital"
 * (sin manejo de efectivo físico). Se usa como regla de desempate cuando
 * hay que elegir un método predominante: en empate de montos, el digital
 * gana sobre el efectivo para la factura SIAT.
 *
 * Por ahora el único digital activo por default es TRANSFERENCIA (7) —
 * alias QR en KafeYana. TARJETA (2) queda fuera intencionalmente porque
 * por default no está habilitada en el operador; si en el futuro se
 * activa, basta agregarla al OR.
 */
export function esCodigoDigital(codigo: number): boolean {
  return codigo === SIN_CODIGO.TRANSFERENCIA;
}

/**
 * Consolida un `PagosObject` con N líneas en una sola línea predominante
 * con el monto total. Diseñado para cuando se va a EMITIR FACTURA SIAT
 * tras una división de cuenta: el SIAT solo admite un `codigoMetodoPago`
 * por factura, así que se reporta el método predominante con el 100% del
 * monto. El bloque original (con el split) sigue viajando aparte para
 * que `VentaPagos` y los acumuladores de caja preserven la auditoría.
 *
 * Reglas de predominio:
 *   1. Gana el método con mayor monto.
 *   2. En empate de montos, gana el método digital (`esCodigoDigital`)
 *      sobre el efectivo.
 *
 * Si el bloque ya tiene 0 o 1 líneas, se devuelve el mismo objeto (no-op).
 * El `total` siempre se preserva (es la suma de las líneas originales y
 * debe coincidir con el monto facturado).
 */
export function consolidarPagoParaFactura(pagos: {
  lineas: Array<{ codigo: number; monto: number }>;
  total: number;
}): {
  lineas: Array<{ codigo: number; monto: number }>;
  total: number;
} {
  if (pagos.lineas.length <= 1) return pagos;

  const ordenadas = [...pagos.lineas].sort((a, b) => {
    if (b.monto !== a.monto) return b.monto - a.monto;
    const aEsDigital = esCodigoDigital(a.codigo);
    const bEsDigital = esCodigoDigital(b.codigo);
    if (aEsDigital && !bEsDigital) return -1;
    if (!aEsDigital && bEsDigital) return 1;
    return 0;
  });

  return {
    lineas: [{ codigo: ordenadas[0].codigo, monto: pagos.total }],
    total: pagos.total,
  };
}
