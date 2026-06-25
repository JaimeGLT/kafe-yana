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

/**
 * Motivos de la nota. Espejo del enum `MotivoNotaAjuste` del backend
 * (1=Devolución, 2=Descuento, 3=Corrección, 4=Otros).
 */
export interface MotivoAjuste {
  codigo: number;
  descripcion: string;
}

export const MOTIVOS_AJUSTE: readonly MotivoAjuste[] = [
  { codigo: 1, descripcion: 'Devolución' },
  { codigo: 2, descripcion: 'Descuento' },
  { codigo: 3, descripcion: 'Corrección' },
  { codigo: 4, descripcion: 'Otros' },
] as const;