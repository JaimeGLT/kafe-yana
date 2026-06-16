// Helpers para identificar al cliente "Consumidor Final" (CF).
// El CF se usa como default en el POS: si el usuario no selecciona cliente,
// se envía id_Cliente=null, codigoTipoDocumento=5 (NIT), numeroDocumento='0'.

import type { Customer } from '../types';
import { CONSUMIDOR_FINAL_NAME } from '../constants/facturacion';

/**
 * Normaliza un nombre para comparación: trim + lowercase.
 * Si el nombre es null/undefined, devuelve string vacío.
 */
function normalize(nombre: string | null | undefined): string {
  return (nombre ?? '').trim().toLowerCase();
}

/**
 * Busca al cliente "Consumidor Final" en la lista por nombre exacto (case-insensitive).
 * Devuelve null si no se encuentra (BD sin migrar → se hace fallback a CF virtual).
 */
export function findConsumidorFinal(clientes: Customer[]): Customer | null {
  const target = normalize(CONSUMIDOR_FINAL_NAME);
  if (!target) return null;
  return clientes.find((c) => normalize(c.nombre) === target) ?? null;
}

/**
 * Devuelve true si el cliente dado es el "Consumidor Final".
 * Si recibe null/undefined, devuelve false (eso no es CF, es "sin cliente").
 */
export function esConsumidorFinal(cliente: Customer | null | undefined): boolean {
  if (!cliente) return false;
  return normalize(cliente.nombre) === normalize(CONSUMIDOR_FINAL_NAME);
}
