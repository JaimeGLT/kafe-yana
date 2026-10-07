import { gql } from './graphql';
import { GET_VENTAS_REPORT } from './queries/ventas.queries';
import type { VentaNode } from '../types/ventas';

interface VentasResponse {
  ventas: { items: VentaNode[]; totalCount: number };
}

const PAGE_SIZE = 200; // MaxTake del backend

/** Estados SIAT que cuentan como venta válida (null = sin factura). */
export function esVentaValida(v: Pick<VentaNode, 'estadoSiat'>): boolean {
  return v.estadoSiat == null || v.estadoSiat === 'VALIDADA' || v.estadoSiat === 'OBSERVADA';
}

/** Descarga TODAS las ventas del rango paginando de a 200. */
export async function fetchVentasRango(fechaDesde: string, fechaHasta: string): Promise<VentaNode[]> {
  const all: VentaNode[] = [];
  let skip = 0;
  for (;;) {
    const data = await gql<VentasResponse>(GET_VENTAS_REPORT, {
      fechaDesde,
      fechaHasta,
      skip,
      take: PAGE_SIZE,
    });
    all.push(...data.ventas.items);
    if (data.ventas.items.length < PAGE_SIZE || all.length >= data.ventas.totalCount) break;
    skip += PAGE_SIZE;
  }
  return all;
}
