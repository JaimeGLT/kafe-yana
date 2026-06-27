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
 *   - `'card'`     → 2 (TARJETA)          — Activo=false por default, requiere habilitación manual del operador.
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
