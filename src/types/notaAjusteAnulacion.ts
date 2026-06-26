// DTOs espejo del backend para anulación/reversión de Notas C/D en el SIAT.
// Mantener sincronizado con:
//   backend/KafeYana.Api/KafeYana.Domain/Dtos/FacturacionDtos/AnulacionNotaAjusteDtos.cs
//   backend/KafeYana.Api/KafeYana.Api/Controllers/NotaAjusteController.cs

import type { SiatResultado } from './siat';

/** Resultado del SIAT para anulación/reversión de nota C/D.
 *  Reutiliza el mismo shape que `SiatResultado` de facturas. */
export type NotaAjusteAnulacionSiat = SiatResultado;

/** Body de POST /api/NotaAjuste/anular/{id}. */
export interface AnularNotaAjusteBody {
  CodigoMotivo: number;
  Nota?: string | null;
}

/** Respuesta de POST /api/NotaAjuste/anular/{id}. */
export interface AnularNotaAjusteRespuesta {
  message: string;
  NotaAjusteId: number;
  NumeroNotaCreditoDebito: number | null;
  CodigoMotivo: number;
  MotivoDescripcion: string;
  Siat: NotaAjusteAnulacionSiat;
}

/** Respuesta de POST /api/NotaAjuste/revertir-anulacion/{id}.
 *  El endpoint no recibe body; sólo el id en la URL. */
export interface RevertirAnulacionNotaAjusteRespuesta {
  message: string;
  NotaAjusteId: number;
  Siat: NotaAjusteAnulacionSiat;
}
