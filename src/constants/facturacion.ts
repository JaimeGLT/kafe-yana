// Constantes relacionadas con la facturación SIAT (Bolivia).
// Mantener sincronizado con el backend (FacturacionController, CuisService, CufdService).

/**
 * Nombre por el que se identifica al cliente "Consumidor Final" en la base de datos.
 * Si la BD no tiene un cliente con este nombre, se hace fallback a un CF virtual
 * (id_Cliente: null, tipoDocumento=5 (NIT), numeroDocumento='0').
 */
export const CONSUMIDOR_FINAL_NAME = 'Consumidor Final';

/** Código SIAT para NIT (también usado para "Consumidor Final" con numeroDocumento='0'). */
export const TIPO_DOC_NIT = 5;

/** Valores por defecto cuando se trata de Consumidor Final (o S/N). */
export const DEFAULT_CF_NUMERO_DOC = '0';
export const DEFAULT_CF_COMPLEMENTO = '';

/**
 * Texto por defecto del `nombreRazonSocial` cuando se emite factura a "Sin Nombre" (S/N).
 * Según la normativa del SIAT, S/N se modela con `codigoTipoDocumento=5` (NIT) +
 * `numeroDocumento='0'` + un `nombreRazonSocial` (que puede ser literalmente "S/N",
 * "Sin Nombre" o el nombre genérico que el comprador quiera dejar).
 * Por defecto usamos "SIN NOMBRE" para que sea explícito en la factura.
 */
export const DEFAULT_SIN_NOMBRE = 'SIN NOMBRE';

/** Debounce de la verificación de NIT en ms. */
export const NIT_VERIFY_DEBOUNCE_MS = 500;

/** Longitud máxima razonable de un NIT/CI en Bolivia. */
export const NIT_MAX_LENGTH = 13;
