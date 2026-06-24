// Diccionario de códigos de error/estado SIAT → mensajes legibles para el cajero.
//
// Por qué existe este archivo:
//   El backend devuelve los `CodigosRespuesta` del SIAT tal cual (código + descripción
//   cruda). El `descripcion` que viene del SIAT suele ser técnico/jurídico y no apto
//   para mostrar al usuario final. Este archivo mapea los códigos más comunes a un
//   mensaje accionable. Para códigos desconocidos, caemos al `descripcion` crudo.
//
// Catálogo de errores comunes (basado en respuestas típicas del SIAT piloto):
//   - Estados: 901=Pendiente, 904=Observada, 908=Validada, 950=Anulada.
//   - Validación XSD/estructura: 1029, 1031, 1040.
//   - Sesión: 1200 (CUIS vencido), 1300 (CUFD vencido).
//   - Transporte: 1100 (timeout).

import type { SiatCodigoRespuesta } from '../types/siat';

/** Mensaje amigable para mostrar al cajero cuando el SIAT devuelve este código. */
export interface ErrorSiat {
  codigo: number;
  titulo: string;
  /** Texto que verá el cajero en el toast. 1-2 frases, lenguaje cotidiano. */
  descripcionCajero: string;
  /** Acción sugerida (opcional). Texto que aparece en una segunda línea. */
  accion?: string;
}

/**
 * Tabla principal. Mantener sincronizada con los códigos que devuelve el
 * SIAT en `SiatResultado.CodigosRespuesta[].codigo`.
 */
export const ERRORES_SIAT: Record<number, ErrorSiat> = {
  // ── Estados de envío ────────────────────────────────────────────────────
  901: {
    codigo: 901,
    titulo: 'Pendiente',
    descripcionCajero:
      'La nota fue registrada pero el SIAT aún no la procesó. Intentá de nuevo en unos minutos.',
    accion: 'Podés reenviarla desde el detalle de la venta con el botón "Reenviar al SIAT".',
  },
  904: {
    codigo: 904,
    titulo: 'Observada',
    descripcionCajero:
      'El SIAT recibió la nota pero detectó observaciones. Revisá los códigos de respuesta para más detalle.',
  },
  908: {
    codigo: 908,
    titulo: 'Validada',
    descripcionCajero: 'La nota fue validada correctamente por el SIAT.',
  },
  950: {
    codigo: 950,
    titulo: 'Anulada',
    descripcionCajero: 'La nota fue anulada en el SIAT.',
  },

  // ── Validación XSD / estructura ────────────────────────────────────────
  1029: {
    codigo: 1029,
    titulo: 'Monto efectivo inconsistente',
    descripcionCajero:
      'El monto a devolver no cuadra con la suma de los productos seleccionados. Contactá al administrador.',
  },
  1031: {
    codigo: 1031,
    titulo: 'Subtotales no cuadran',
    descripcionCajero:
      'La suma de los subtotales no coincide con el monto total de la nota. Contactá al administrador.',
  },
  1040: {
    codigo: 1040,
    titulo: 'Línea no pertenece a la factura',
    descripcionCajero:
      'Uno de los productos seleccionados no corresponde a esta factura. Recargá la página y volvé a intentar.',
  },

  // ── Sesión / credenciales ──────────────────────────────────────────────
  1100: {
    codigo: 1100,
    titulo: 'Timeout del SIAT',
    descripcionCajero:
      'El SIAT no respondió a tiempo. Verificá tu conexión y reintentá en unos minutos.',
  },
  1200: {
    codigo: 1200,
    titulo: 'CUIS vencido',
    descripcionCajero:
      'La credencial del sistema (CUIS) está vencida. Pedile al administrador que la renueve.',
  },
  1300: {
    codigo: 1300,
    titulo: 'CUFD vencido',
    descripcionCajero:
      'El código diario de facturación (CUFD) está vencido. Pedile al cajero que lo renueve antes de continuar.',
  },
};

/** Busca un error conocido por código. Devuelve `undefined` si no está catalogado. */
export function getErrorSiat(codigo: number): ErrorSiat | undefined {
  return ERRORES_SIAT[codigo];
}

/**
 * Convierte la lista `CodigosRespuesta` del backend en un string multilínea
 * apto para mostrar en un toast o alerta.
 *
 * - Para códigos conocidos: usa `titulo` + `descripcionCajero` + `accion`.
 * - Para códigos desconocidos: usa el `descripcion` crudo del SIAT.
 * - Si la lista está vacía: devuelve un fallback genérico.
 */
export function formatearErroresSiat(codigos: SiatCodigoRespuesta[] | null | undefined): string {
  if (!codigos || codigos.length === 0) {
    return 'El SIAT rechazó la operación sin detallar el motivo. Contactá al administrador.';
  }

  return codigos
    .map((c) => {
      const conocido = getErrorSiat(c.codigo);
      if (!conocido) {
        return `[${c.codigo}] ${c.descripcion || 'Error sin descripción del SIAT.'}`;
      }
      const lines = [`[${conocido.codigo}] ${conocido.titulo}: ${conocido.descripcionCajero}`];
      if (conocido.accion) lines.push(`  → ${conocido.accion}`);
      return lines.join('\n');
    })
    .join('\n');
}

/** Helper para obtener un solo error legible (toma el primero de la lista). */
export function formatearPrimerErrorSiat(codigos: SiatCodigoRespuesta[] | null | undefined): string {
  if (!codigos || codigos.length === 0) {
    return 'El SIAT rechazó la operación sin detallar el motivo.';
  }
  const primero = codigos[0];
  const conocido = getErrorSiat(primero.codigo);
  if (conocido) {
    return conocido.accion
      ? `${conocido.descripcionCajero} ${conocido.accion}`
      : conocido.descripcionCajero;
  }
  return primero.descripcion || `Error ${primero.codigo} del SIAT.`;
}