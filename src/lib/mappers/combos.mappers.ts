import type { ComboNode, ProductNode } from '../../types/graphql';
import type { Combo, Product } from '../../types';

const TIPO_MAP: Record<string, 'comprado' | 'elaborado' | 'combo'> = {
  Comprado: 'comprado',
  Elaborado: 'elaborado',
  Combos: 'combo',  
};

export function mapProduct(n: ProductNode): Product {
  return {
    id: String(n.id),
    code: String(n.id),
    name: n.nombre,
    description: '',
    tipo: TIPO_MAP[n.tipo] ?? 'comprado',
    categoryId: '',
    categoryName: n.categoriaNombre,
    unit: 'unidad',
    costPrice: n.costo,
    salePrice: n.precioVenta,
    stock: n.stock,
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

export function mapCombo(node: ComboNode, products: Product[]): Combo {
  const items = node.productos.map((p) => {
    const prod = products.find((sp) => sp.id === String(p.productoId));
    return {
      id: String(p.productoId),
      productId: String(p.productoId),
      productName: prod?.name ?? '',
      productTipo: (prod?.tipo ?? 'comprado') as 'comprado' | 'elaborado' | 'combo',
      quantity: p.cantidad,
      unitCost: prod?.costPrice ?? 0,
      esOpcional: p.opcional,
    };
  });

  return {
    id: String(node.id),
    name: node.nombre,
    description: node.descripcion,
    items,
    price: node.precio,
    costoTotal: items.reduce((s, i) => s + i.unitCost * i.quantity, 0),
    availability: node.cantidadProducible,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}