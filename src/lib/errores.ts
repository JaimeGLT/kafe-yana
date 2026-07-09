import { ApiError } from './api';

/**
 * Resultado de interpretar un error del backend. Listo para pasar a
 * `toast.error(title, message)` o `toast.warning(...)` desde cualquier
 * pantalla. La razón de centralizar esto (en vez de mapear caso por
 * caso en cada componente) es que los mensajes del backend cambian
 * con cada fix y acá tenemos un solo lugar para mantener las
 * detecciones de patrones.
 */
export interface ErrorInterpretado {
  /** Título corto para el toast. */
  title: string;
  /** Mensaje en español para el cajero. */
  message: string;
  /** Cuándo mostrar como warning vs error. */
  nivel: 'error' | 'warning';
}

/**
 * Mapea un error genérico del cobro a un mensaje útil para el POS.
 *
 * Casos cubiertos (todos verificados contra respuestas reales del
 * backend KafeYana + memoria [[kafeyana-contingencia-siat]] +
 * [[kafeyana-catalogo-typeinit-duplicate-keys]]):
 *
 * 1. NRE crudo (`Object reference not set to an instance of an object`)
 *    → bug del catálogo estático `_cache = FallbackHardcoded` con
 *    forward reference: cuando el sync al boot falla (SIAT caído) el
 *    catálogo queda null. Mostramos un mensaje claro.
 *
 * 2. "SIAT no responde" / "Circuito SIAT abierto" / "El CUFD puede
 *    haber vencido" → el monitor de conectividad detectó caída y/o
 *    está intentando registrar contingencia.
 *
 * 3. Errores de validación del DTO (400) → mostrar tal cual porque ya
 *    son mensajes claros del backend.
 *
 * 4. Status 500 genérico → recomendar cobrar sin factura como plan B.
 *
 * 5. Status 0 (sin red) → mensaje de red.
 */
export function interpretarErrorCobro(
  err: unknown,
  fallback: string,
): ErrorInterpretado {
  if (err instanceof ApiError) {
    const msg = err.message ?? '';
    const lower = msg.toLowerCase();

    // ─── NRE crudo: bug del catálogo estático ───────────────────────
    if (lower.includes('object reference not set')) {
      return {
        title: 'Error interno del servidor',
        message:
          'No se pudo facturar porque el sistema no tiene los catálogos del SIAT cargados. '
          + 'Esto pasa cuando el servidor arrancó con el SIAT caído. '
          + 'Esperá 1-2 minutos y reintentá, o cobrá sin factura.',
        nivel: 'error',
      };
    }

    // ─── SIAT caído / circuito abierto / contingencia ────────────────
    if (
      lower.includes('siat no responde')
      || lower.includes('circuito siat abierto')
      || lower.includes('cufd puede haber vencido')
      || lower.includes('cuf/cufd')
      || lower.includes('modo contingencia')
    ) {
      return {
        title: 'SIAT no responde',
        message:
          'El SIN no está disponible. La venta se guardó como pendiente y '
          + 'se enviará automáticamente cuando vuelva el servicio. '
          + 'Si necesitás facturar ya, cobrá sin factura.',
        nivel: 'warning',
      };
    }

    // ─── Status 0 = sin red ─────────────────────────────────────────
    if (err.status === 0) {
      return {
        title: 'Sin conexión',
        message:
          'No se pudo contactar al servidor. Verificá tu red e intentá de nuevo.',
        nivel: 'error',
      };
    }

    // ─── Errores 4xx del DTO: ya vienen claros del backend ───────────
    if (err.status >= 400 && err.status < 500) {
      return {
        title: 'No se pudo cobrar',
        message: msg || fallback,
        nivel: 'error',
      };
    }

    // ─── Status 5xx genérico ─────────────────────────────────────────
    if (err.status >= 500) {
      return {
        title: 'Error del servidor',
        message:
          'El servidor tuvo un problema al procesar el cobro. '
          + 'Si necesitás cobrar ya, intentá sin factura.',
        nivel: 'error',
      };
    }

    return { title: 'Error', message: msg || fallback, nivel: 'error' };
  }

  // Error genérico no ApiError (p.ej. error de JavaScript).
  const mensaje = err instanceof Error ? err.message : fallback;
  return { title: 'Error', message: mensaje, nivel: 'error' };
}

/**
 * Interpreta errores de edición/eliminación de rondas y detalles.
 * El backend tira errores crudos de EF Core cuando hay pagos parciales
 * involucrados (reglas de negocio + FK no-nullable). Mapeamos los patrones
 * conocidos a mensajes claros para el cajero.
 *
 * Casos cubiertos:
 *
 * 1. `"association between entity types 'Producto' and 'Detalle_ronda'"`
 *    o `"has been severed"` → el cajero intentó reducir la cantidad de un
 *    detalle que ya tiene `cantidadPagada > 0`. El backend lo rechaza
 *    porque la cantidad final sería menor que lo ya cobrado.
 *
 * 2. `"registro pertenece a otro"` / `"no puede eliminarse"` → típico de
 *    reglas de auditoría (Kardex / integridad referencial con pagos).
 *    Suele aparecer al eliminar una ronda cuyos detalles tienen
 *    `cantidadPagada > 0`.
 */
export function interpretarErrorEdicion(
  err: unknown,
  fallback: string,
): ErrorInterpretado {
  if (err instanceof ApiError) {
    const msg = err.message ?? '';
    const lower = msg.toLowerCase();

    // ─── Ronda/detalle con pagos parciales (severed relationship) ─────
    if (
      lower.includes('association between entity types')
      || lower.includes('has been severed')
    ) {
      return {
        title: 'Items con pagos parciales',
        message:
          'No se puede modificar este ítem porque tiene pagos parciales. '
          + 'Podés agregar nuevos ítems o editar los no pagados.',
        nivel: 'warning',
      };
    }

    // ─── No se puede eliminar por integridad con pagos ─────────────────
    if (
      lower.includes('registro pertenece a otro')
      || lower.includes('no puede eliminarse')
      || (lower.includes('no se puede eliminar') && lower.includes('pago'))
    ) {
      return {
        title: 'No se puede eliminar',
        message:
          'La ronda tiene items con pagos parciales. Reversá los pagos primero '
          + 'o cobrá el saldo pendiente antes de eliminar.',
        nivel: 'warning',
      };
    }

    // ─── Status 0 = sin red ─────────────────────────────────────────
    if (err.status === 0) {
      return {
        title: 'Sin conexión',
        message:
          'No se pudo contactar al servidor. Verificá tu red e intentá de nuevo.',
        nivel: 'error',
      };
    }

    // ─── Errores 4xx: ya vienen claros del backend ────────────────────
    if (err.status >= 400 && err.status < 500) {
      return { title: 'No se pudo completar la acción', message: msg || fallback, nivel: 'error' };
    }

    // ─── Status 5xx genérico ─────────────────────────────────────────
    if (err.status >= 500) {
      return {
        title: 'Error del servidor',
        message: 'El servidor tuvo un problema al procesar la solicitud. Intentá de nuevo.',
        nivel: 'error',
      };
    }

    return { title: 'Error', message: msg || fallback, nivel: 'error' };
  }

  const mensaje = err instanceof Error ? err.message : fallback;
  return { title: 'Error', message: mensaje, nivel: 'error' };
}
