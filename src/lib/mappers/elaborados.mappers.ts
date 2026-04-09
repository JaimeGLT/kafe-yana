import type { ElaboradoNode } from '../../types/graphql';
import type { Product } from '../../types';

export function mapElaborado(n: ElaboradoNode): Product {
  return {
    id: String(n.id_Producto),
    code: String(n.id_Producto),
    name: n.producto.nombre,
    description: n.producto.descripcion ?? '',
    tipo: 'elaborado',
    categoryId: String(n.producto.categoria_Id),
    categoryName: '',
    unit: n.unidad_medida ?? 'unidad',
    costPrice: 0,
    salePrice: n.producto.precio,
    stock: n.receta?.cantidadProducible ?? 0,
    minStock: 0,
    maxStock: 0,
    barcode: '',
    variations: [],
    hasVariations: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
