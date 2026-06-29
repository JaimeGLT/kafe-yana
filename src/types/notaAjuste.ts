// DTOs espejo del backend para el módulo de Notas de Crédito/Débito SIAT.
// Mantener sincronizado con:
//   backend/KafeYana.Api/KafeYana.Domain/Dtos/FacturacionDtos/NotaAjusteDtos.cs
//   backend/KafeYana.Api/KafeYana.Api/Controllers/NotaAjusteController.cs

import type { SiatCodigoRespuesta } from './siat';

/**
 * Línea de detalle que el frontend ENVÍA al backend. NO es la línea SIAT
 * final: cada producto seleccionado por el cajero se traduce en el backend
 * a un PAR (trans=1 + trans=2). Por eso en el body sólo se usa
 * `codigoDetalleTransaccion = 1` (Devolución) como marcador semántico;
 * el servicio de backend genera la línea trans=2 complementaria.
 *
 * Regla crítica: `idDetallePagoOriginal` DEBE corresponder a una línea
 * real de la venta original. El backend rechaza con 400 si la FK no
 * pertenece a la venta.
 */
export interface DtoNotaAjusteDetalle {
  idDetallePagoOriginal: number;
  /** Marcador semántico. El frontend siempre envía 1 (Devolución);
   *  el backend genera el trans=2 complementario. */
  codigoDetalleTransaccion: number;
  cantidad: number;
  precioUnitario: number;
  subTotal: number;
  montoDescuento?: number | null;
}

/**
 * Body de POST /api/NotaAjuste.
 * El `detalles` representa los PRODUCTOS seleccionados por el cajero para
 * devolver (no las líneas SIAT finales). El backend expande cada producto
 * en un par trans=1 + trans=2 y calcula los totales.
 *
 * Validación: al menos 1 producto (que el backend expandirá a 2 líneas,
 * cumpliendo XSD minOccurs=2 en <detalle>).
 */
export interface CrearNotaAjusteRequest {
  idVenta: number;
  codigoMotivoAjuste: number;
  montoDescuentoCreditoDebito?: number | null;
  usuario?: string | null;
  detalles: DtoNotaAjusteDetalle[];
}

/**
 * Resultado del envío al SIAT (espejo del `ResultadoEnvioNotaAjusteSiatDto`
 * del backend).
 */
export interface NotaAjusteSiatResultado {
  Enviado: boolean;
  Transaccion: boolean;
  NotaAjusteId?: number | null;
  NumeroNotaCreditoDebito?: number | null;
  Cuf?: string | null;
  CodigoEstado?: number | null;
  CodigoRecepcion?: string | null;
  CodigoDescripcion?: string | null;
  ErrorMensaje?: string | null;
  CodigosRespuesta: SiatCodigoRespuesta[];
}

/** Respuesta completa de POST /api/NotaAjuste. */
export interface CrearNotaAjusteRespuesta {
  message: string;
  VentaId: number;
  Siat: NotaAjusteSiatResultado;
}

/**
 * Resumen de una NotaAjuste para listas y badges.
 * Proyección delgada (sin detalles ni XML) — sirve para mostrar la nota
 * en la lista de ventas y en el detalle, sin cargar el grafo completo.
 *
 * Espejo de `DtoNotaAjusteResumen` en backend.
 */
export interface NotaAjusteResumen {
  id: number;
  idVenta: number;
  numeroNotaCreditoDebito: number;
  /** Nombre del estado SIAT: 'Validada' | 'Observada' | 'Pendiente' | 'Anulada'. */
  estadoSiat: string | null;
  codigoRecepcion: string | null;
  codigoMotivoAjuste: number;
  /** ISO 8601 — se formatea con `formatDate` en la UI. */
  fechaEmision: string;
  montoTotalOriginal: number;
  montoTotalDevuelto: number;
  montoEfectivoCreditoDebito: number;
  cuf?: string | null;
  /**
   * True si la anulación de esta nota ya fue revertida en el SIAT. El SIN
   * solo permite revertir una vez; tras revertir, la nota vuelve a estado
   * Validada pero NO puede volver a anularse (el backend rechaza con
   * VentaException, pero acá lo reflejamos también en la UI ocultando
   * el botón "Anular en SIAT").
   */
  revertidaAnulacion?: boolean;
}

/** Respuesta tipada de GET /api/NotaAjuste/por-venta/{ventaId}. */
export interface NotasPorVentaRespuesta {
  ventaId: number;
  total: number;
  notas: NotaAjusteResumen[];
}

// ── Catálogos ──────────────────────────────────────────────────────────────

/**
 * Catálogo válido del XSD `notaComputarizadaCreditoDebito.xsd` para
 * `codigoDetalleTransaccion` (maxInclusive=2 en el XSD).
 *
 * El frontend usa `Devolucion = 1` como marcador semántico en el body
 * (un detalle por producto seleccionado). El servicio de backend
 * (NotaAjusteSiatEnvioService.ExpandirParesTransaccion) genera el
 * `Descuento = 2` complementario para formar el par canónico SIAT.
 */
export const CODIGOS_DETALLE_TRANSACCION = {
  Devolucion: 1,
  Descuento:  2,
} as const;

export type CodigoDetalleTransaccion =
  (typeof CODIGOS_DETALLE_TRANSACCION)[keyof typeof CODIGOS_DETALLE_TRANSACCION];

// El dropdown "Motivo del ajuste" del NotaAjusteModal consume el mismo catálogo
// de motivos de anulación (`useMotivosAnulacion` → `GET /api/catalogos/motivos-anulacion`)
// porque el SIAT **no** expone una paramétrica separada para emisión de notas C/D
// (verificado contra el WSDL de FacturacionSincronizacion, jun-2026). El backend
// persiste `NotaAjuste.CodigoMotivoAjuste` solo como clasificación humana — el XSD
// de emisión `notaComputarizadaCreditoDebito.xsd` no incluye el campo
// `<codigoMotivo>`, así que el SIAT no lo valida.