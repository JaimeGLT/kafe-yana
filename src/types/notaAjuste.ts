// DTOs espejo del backend para el módulo de Notas de Crédito/Débito SIAT.
// Mantener sincronizado con:
//   backend/KafeYana.Api/KafeYana.Domain/Dtos/FacturacionDtos/NotaAjusteDtos.cs
//   backend/KafeYana.Api/KafeYana.Api/Controllers/NotaAjusteController.cs

import type { SiatCodigoRespuesta } from './siat';

/**
 * Línea de detalle de una Nota de Crédito/Débito. Replica el
 * `DtoNotaAjusteDetalle` del backend.
 *
 * Regla crítica: `idDetallePagoOriginal` DEBE corresponder a una línea
 * real de la venta original. El backend rechaza con 400 si la FK no
 * pertenece a la venta.
 */
export interface DtoNotaAjusteDetalle {
  idDetallePagoOriginal: number;
  /** Catálogo válido del XSD: 1 = Devolución, 2 = Descuento. NO existe código 3.
   *  El XSD rechaza cualquier valor fuera de {1, 2} con `maxInclusive='2'`. */
  codigoDetalleTransaccion: number;
  cantidad: number;
  precioUnitario: number;
  subTotal: number;
  montoDescuento?: number | null;
}

/**
 * Body de POST /api/NotaAjuste.
 * El backend exige mínimo 2 detalles (validación que la UI resuelve
 * automáticamente con un split silencioso cuando el cajero selecciona 1).
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
 * `codigoDetalleTransaccion`. El tipo acepta SOLO {1, 2}; cualquier otro
 * valor se rechaza en el SIAT con `maxInclusive='2'`.
 *
 * La "línea técnica" que la UI inyecta silenciosamente cuando el cajero
 * selecciona 1 solo producto usa `Descuento = 2` (no existe un código
 * "AjusteTecnico" en el XSD — fue un invento anterior que el piloto
 * rechaza con error 920).
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