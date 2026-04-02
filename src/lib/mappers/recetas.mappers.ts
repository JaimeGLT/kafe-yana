import type { RecetaNode } from '../../types/graphql';
import type { Receta } from '../../types';

export function mapReceta(n: RecetaNode): Receta {
  const ingredientes = n.detalles.map((d) => ({
    id: String(d.id_insumo),
    insumoId: String(d.id_insumo),
    insumoName: d.nombre,
    unidadMinima: '',
    quantity: d.cantidad,
    merma: d.merma,
    unitCost: 0,
    subtotal: d.subTotal,
  }));

  const costoTotal = ingredientes.reduce((sum, i) => sum + i.subtotal, 0);

  return {
    id: String(n.id),
    productId: String(n.id_Elaborado),
    productName: n.nombre,
    nombre: n.nombre,
    porcionesBase: n.porciones ?? 1,
    ingredientes,
    costoTotal,
    costoPorPorcion: costoTotal / (n.porciones > 0 ? n.porciones : 1),
    notas: n.nota ?? undefined,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
