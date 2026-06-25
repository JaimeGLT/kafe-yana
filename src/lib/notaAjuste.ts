// Helpers para construir el body del POST /api/NotaAjuste.
//
// Regla SIAT (ver creditodebito-ejemplo-sin/notaComputarizadaCreditoDebito.xsd):
//   • <detalle> minOccurs="2" maxOccurs="500"
//   • codigoDetalleTransaccion ∈ {1, 2} (1 = referencia al item original,
//                                          2 = devolución efectiva)
//
// El frontend representa "productos a devolver". Por cada producto seleccionado
// emite UN detalle con `codigoDetalleTransaccion = 1` (marcador semántico).
// El backend (NotaAjusteSiatEnvioService.ExpandirParesTransaccion) reconstruye
// el PAR SIAT canónico (trans=1 + trans=2) autoritativamente a partir del
// detalle original de la venta — el frontend nunca envía el trans=2.
//
// Ver plan: C:\Users\jaime\.claude\plans\estoy-haicendo-facturacion-y-rippling-snowflake.md

import type { SaleItem } from '../types/sales';
import {
  CODIGOS_DETALLE_TRANSACCION,
  type CrearNotaAjusteRequest,
  type DtoNotaAjusteDetalle,
  type NotaAjusteResumen,
} from '../types/notaAjuste';

/** Redondeo a N decimales sin arrastrar errores de coma flotante. */
export const round = (x: number, decimals = 2): number => {
  const factor = 10 ** decimals;
  return Math.round((x + Number.EPSILON) * factor) / factor;
};

/** Producto seleccionado por el cajero + cantidad a devolver. */
export interface SelectedItem {
  item: SaleItem;
  cantidad: number;
}

/**
 * Construye el body del POST /api/NotaAjuste. Por cada producto seleccionado
 * emite UN detalle con `codigoDetalleTransaccion = 1` (Devolución) como
 * marcador semántico: el backend (NotaAjusteSiatEnvioService) lo expande
 * autoritativamente al PAR SIAT canónico (trans=1 + trans=2) usando el
 * detalle original de la venta, calcula los totales y rechaza cualquier
 * body mal formado.
 *
 * El backend rechaza con 400 si recibe `codigoDetalleTransaccion != 1` en
 * el body, por eso acá solo se envía el marcador.
 *
 * @throws Error si algún producto seleccionado no tiene `idDetallePagoOriginal`
 *         (no se puede generar la nota sin la FK al detalle de la venta original).
 */
export function construirCuerpoNotaAjuste(params: {
  ventaId: number;
  codigoMotivoAjuste: number;
  seleccionados: SelectedItem[];
  usuario?: string | null;
}): CrearNotaAjusteRequest {
  const detalles: DtoNotaAjusteDetalle[] = [];
  for (const sel of params.seleccionados) {
    if (sel.cantidad <= 0) continue;
    if (sel.item.idDetallePagoOriginal == null) {
      throw new Error(
        `El producto "${sel.item.productName}" no tiene idDetallePagoOriginal. ` +
          'Recargá la página; si persiste, la venta es muy vieja para ajustar.',
      );
    }
    const precio = sel.item.unitPrice;
    detalles.push({
      idDetallePagoOriginal: sel.item.idDetallePagoOriginal,
      codigoDetalleTransaccion: CODIGOS_DETALLE_TRANSACCION.Devolucion, // 1 (marcador)
      cantidad: sel.cantidad,
      precioUnitario: precio,
      subTotal: round(precio * sel.cantidad, 2),
    });
  }
  return {
    idVenta: params.ventaId,
    codigoMotivoAjuste: params.codigoMotivoAjuste,
    detalles,
    usuario: params.usuario,
  };
}

/**
 * Monto total devuelto al cliente = Σ (unitPrice × cantidadDevuelta).
 * Coincide con la suma de subtotales trans=2 que verá el SIAT.
 */
export function calcularMontoDevuelto(seleccionados: SelectedItem[]): number {
  return round(
    seleccionados.reduce((acc, s) => acc + s.item.unitPrice * s.cantidad, 0),
    2,
  );
}

/**
 * Adapta el mapa `Record<itemId, qty>` del modal a una lista de `SelectedItem`
 * apta para las funciones de este módulo. Filtra cantidades inválidas y
 * entradas sin item resoluble.
 */
export function mapearSeleccionados(
  selectedItems: Record<string, number>,
  items: SaleItem[],
): SelectedItem[] {
  const resultado: SelectedItem[] = [];
  for (const [id, qty] of Object.entries(selectedItems)) {
    if (qty <= 0) continue;
    const item = items.find((i) => i.id === id);
    if (!item) continue;
    resultado.push({ item, cantidad: qty });
  }
  return resultado;
}

/**
 * Cantidad disponible para devolver de un item = quantity − cantidadDevuelta.
 * Si ya se devolvió todo, devuelve 0 (el modal debe bloquear el item).
 *
 * Alineado con el backend (`NotaAjusteSiatEnvioService` línea ~80 y
 * `NotaAjusteRepositorio.ObtenerCantidadDevueltaPorDetallePagoAsync`):
 * ambos calculan sobre notas con EstadoSiat = Validada.
 */
export function calcularCantidadDisponible(item: SaleItem): number {
  const devuelto = Number(item.cantidadDevuelta ?? 0);
  return Math.max(0, item.quantity - devuelto);
}

/**
 * Saldo monetario efectivo de una venta = total − Σ(montoTotalDevuelto) de
 * las notas válidas. Alineado con el backend
 * (`NotaAjusteSiatEnvioService` validación de saldoEfectivo) y con el
 * mapper existente (`sales.mapper.ts:85-103`, que sólo considera notas
 * en estado 'Validada').
 *
 * Devuelve 0 si el saldo es negativo (ya devuelto más que el total —
 * situación anómala pero defensiva).
 */
export function calcularSaldoEfectivo(
  totalVenta: number,
  notas: NotaAjusteResumen[] | undefined | null,
): number {
  if (!notas || notas.length === 0) return Math.max(0, totalVenta);
  const devuelto = notas
    .filter((n) => (n.estadoSiat ?? '').toLowerCase() === 'validada')
    .reduce(
      (acc, n) => acc + (Number.isFinite(n.montoTotalDevuelto) ? n.montoTotalDevuelto : 0),
      0,
    );
  return Math.max(0, totalVenta - devuelto);
}
