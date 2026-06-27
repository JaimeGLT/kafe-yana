// DTOs espejo del backend para el módulo de Facturación SIAT.
// Mantener sincronizado con FacturacionController.cs y los DTOs de Application/Dtos/FacturacionDtos.

/** Valores numéricos del enum FacturaEstado (KafeYana.Domain.TiposDeDatos).
 *  Útiles para comparar contra respuestas REST (que llegan como número porque
 *  el backend NO usa JsonStringEnumConverter). */
export const SIAT_ESTADO = {
  Pendiente: 901,
  Observada: 904,
  Validada:  908,
  Anulada:   950,
} as const;

/** Estado del envío al SIAT (string por GraphQL). Las respuestas REST traen
 *  el enum como número, por eso los helpers aceptan también number. */
export type SiatEstado = 'Validada' | 'Observada' | 'Pendiente' | 'Anulada' | string;

/** Helper: el estado SIAT representa una factura anulada, sea string o número. */
export const esEstadoAnuladaSiat = (
  estado: SiatEstado | number | null | undefined,
): boolean => {
  if (estado == null) return false;
  if (typeof estado === 'number') return estado === SIAT_ESTADO.Anulada;
  return estado.toLowerCase() === 'anulada';
};

/** Helper: el estado SIAT representa una factura validada. */
export const esEstadoValidadaSiat = (
  estado: SiatEstado | number | null | undefined,
): boolean => {
  if (estado == null) return false;
  if (typeof estado === 'number') return estado === SIAT_ESTADO.Validada;
  return estado.toLowerCase() === 'validada';
};

/** Un código/mensaje devuelto por el SIAT. */
export interface SiatCodigoRespuesta {
  codigo: number;
  descripcion: string;
}

/** Resultado del envío al SIAT. */
export interface SiatResultado {
  Enviado: boolean;
  Transaccion: boolean;
  EstadoSiat: SiatEstado | null;
  CodigoEstado: number | null;
  CodigoRecepcion: string | null;
  CodigoDescripcion: string | null;
  ErrorMensaje: string | null;
  CodigosRespuesta: SiatCodigoRespuesta[];
}

/** Resultado de la impresión de la factura (server-side TCP). */
export interface SiatImpresion {
  Enviado: boolean;
  Ok: boolean;
  ErrorMensaje: string | null;
  UrlQr: string | null;
}

/** Respuesta de GET /api/Facturacion/verificar-nit/{nit}. */
export interface VerificarNitRespuesta {
  nit: number;
  valido: boolean;
  transaccion: boolean;
  mensajes: { codigo: number; descripcion: string }[];
}

/** Respuesta de POST /api/Facturacion/imprimir/{ventaId}. */
export interface ImprimirFacturaRespuesta {
  message: string;
  VentaId: number;
  ImpresionFactura: SiatImpresion;
}

/** Respuesta de POST /api/Facturacion/reenviar/{ventaId}. */
export interface ReenviarFacturaRespuesta {
  message: string;
  VentaId: number;
  Siat: SiatResultado;
}

/** Respuesta de POST /api/Facturacion/anular/{ventaId}. */
export interface AnularFacturaRespuesta {
  message: string;
  VentaId: number;
  CodigoMotivo: number;
  MotivoDescripcion: string;
  Siat: SiatResultado;
}

/** Respuesta de POST /api/Facturacion/revertir-anulacion/{ventaId}.
 *  El endpoint no recibe body; sólo el ventaId en la URL.
 *  Si Transaccion=true, el estado SIAT vuelve a Validada (908) y
 *  Venta.RevertidaAnulacion queda en true. */
export interface RevertirAnulacionFacturaRespuesta {
  message: string;
  VentaId: number;
  Siat: SiatResultado;
}
