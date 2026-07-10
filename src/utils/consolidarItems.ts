/**
 * Helper para consolidar items duplicados por nombre exacto (case-insensitive).
 *
 * Caso de uso: cuando un cliente pide el mismo producto en múltiples rondas
 * (ej: 2x Café en ronda 1, 3x Café en ronda 2), las impresiones y la preview
 * de la factura SIAT mostraban líneas separadas. Con este helper se consolidan
 * en una sola línea con la cantidad sumada.
 *
 * Reglas:
 * - 'Café' === 'café ' (mismo nombre tras trim + lowercase)
 * - 'Café' !== 'Café con leche' (productos distintos — NO se agrupan)
 * - El item consolidado conserva el nombre del primer registro.
 * - Los campos `cantidad` y `total` se suman (si existen).
 * - El resto de los campos vienen del primer registro.
 */
export interface ItemConsolidable {
  nombre: string;
  cantidad: number;
  total?: number;
  [key: string]: unknown;
}

export function consolidarItemsPorNombre<T extends ItemConsolidable>(
  items: T[],
): T[] {
  const mapa = new Map<string, T>();
  for (const it of items) {
    const key = (it.nombre ?? '').trim().toLowerCase();
    if (!key) continue;
    const existente = mapa.get(key);
    if (!existente) {
      mapa.set(key, { ...it });
    } else {
      existente.cantidad = (existente.cantidad ?? 0) + (it.cantidad ?? 0);
      if (typeof existente.total === 'number' && typeof it.total === 'number') {
        existente.total = existente.total + it.total;
      }
      mapa.set(key, existente);
    }
  }
  return Array.from(mapa.values());
}
