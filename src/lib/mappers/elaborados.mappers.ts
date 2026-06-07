import type { ElaboradoNode } from '../../types/graphql';
import type { Product, Receta } from '../../types';

export function mapElaborado(n: ElaboradoNode): Product {
  const cat = n.producto.categoria;
  return {
    id: String(n.id_Producto),
    code: String(n.id_Producto),
    name: n.producto.nombre,
    description: n.producto.descripcion ?? '',
    tipo: 'elaborado',
    categoryId: cat ? String(cat.id) : '',
    categoryName: cat ? cat.nombre : '',
    unit: n.unidad_medida ?? 'unidad',
    costPrice: 0,
    salePrice: n.producto.precio,
    stock: n.receta?.cantidadProducible ?? 0,
    minStock: 0,
    maxStock: 0,
    barcode: '',
    variations: [],
    hasVariations: n.variaciones.length > 0,
    isActive: true,
    codigoSin: n.producto.codigoSin ?? '',
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
    unitCost: d.insumo.factor_conversion > 0 ? d.insumo.costo / d.insumo.factor_conversion : 0,
    subtotal: d.subTotal,
  }));

  const costoTotal = ingredientes.reduce((sum, i) => sum + i.subtotal, 0);
  const porciones = n.receta.porciones > 0 ? n.receta.porciones : 1;

  return {
    id: String(n.receta.id),
    productId: String(n.id_Producto),
    productName: n.producto.nombre,
    nombre: n.receta.nombre,
    porcionesBase: porciones,
    ingredientes,
    costoTotal,
    costoPorPorcion: costoTotal / porciones,
    notas: n.receta.nota ?? undefined,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
