import type { RecetaNode } from '../../types/graphql';
import type { Receta } from '../../types';

export function mapReceta(n: RecetaNode): Receta | null {
  // Recetas huérfanas (elaborado eliminado) — las descartamos
  if (!n.elaborado) return null;

  const ingredientes = n.detalles
    .filter((d) => d.insumo != null)
    .map((d) => ({
      id: String(d.id_insumo),
      insumoId: String(d.id_insumo),
      insumoName: d.insumo!.nombre,
      unidadMinima: d.insumo!.unidad_min_uso,
      quantity: d.cantidad,
      merma: d.merma,
      unitCost: d.insumo!.costo / (d.insumo!.factor_conversion || 1),
      subtotal: d.cantidad * (d.insumo!.costo / (d.insumo!.factor_conversion || 1)) * (1 + d.merma / 100),
    }));

  const costoTotal = ingredientes.reduce((sum, i) => sum + i.subtotal, 0);
  const porciones = n.porciones > 0 ? n.porciones : 1;

  return {
    id: String(n.id),
    productId: String(n.elaborado.id_Producto),
    productName: n.nombre,
    nombre: n.nombre,
    porcionesBase: porciones,
    ingredientes,
    costoTotal,
    costoPorPorcion: costoTotal / porciones,
    notas: n.nota ?? undefined,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
