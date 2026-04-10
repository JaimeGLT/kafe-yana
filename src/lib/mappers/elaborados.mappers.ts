import type { ElaboradoNode } from '../../types/graphql';
import type { Product, Receta } from '../../types';

export function mapElaborado(n: ElaboradoNode): Product {
  const stock = n.receta && n.receta.detalles.length > 0
    ? Math.min(...n.receta.detalles.map((d) =>
        Math.floor(d.insumo.stock_actual / (d.cantidad * (1 + d.merma / 100)))
      ))
    : 0;

  return {
    id: String(n.id_Producto),
    code: String(n.id_Producto),
    name: n.producto.nombre,
    description: n.producto.descripcion ?? '',
    tipo: 'elaborado',
    categoryId: '',
    categoryName: '',
    unit: n.unidad_medida ?? 'unidad',
    costPrice: 0,
    salePrice: n.producto.precio,
    stock,
    minStock: 0,
    maxStock: 0,
    barcode: '',
    variations: [],
    hasVariations: n.variaciones.length > 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function mapRecetaFromElaborado(n: ElaboradoNode): Receta | null {
  if (!n.receta) return null;

  const ingredientes = n.receta.detalles.map((d) => ({
    id: String(d.id_insumo),
    insumoId: String(d.id_insumo),
    insumoName: d.insumo.nombre,
    unidadMinima: d.insumo.unidad_min_uso,
    quantity: d.cantidad,
    merma: d.merma,
    unitCost: d.insumo.costo,
    subtotal: d.cantidad * d.insumo.costo,
  }));

  const costoTotal = ingredientes.reduce((sum, i) => sum + i.subtotal, 0);

  return {
    id: String(n.receta.id),
    productId: String(n.id_Producto),
    productName: n.producto.nombre,
    nombre: n.receta.nombre,
    porcionesBase: 1,
    ingredientes,
    costoTotal,
    costoPorPorcion: costoTotal,
    notas: n.receta.nota ?? undefined,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
