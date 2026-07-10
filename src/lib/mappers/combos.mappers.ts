import type { ComboNode, ProductsForComboResponse } from '../../types/graphql';
import type { Combo, Product } from '../../types';

const TIPO_MAP: Record<string, 'comprado' | 'elaborado' | 'combo'> = {
  Comprado: 'comprado',
  comprado: 'comprado',
  Elaborado: 'elaborado',
  elaborado: 'elaborado',
  Combo: 'combo',
  combo: 'combo',
  Combos: 'combo',
  combos: 'combo',
};

type CompradoItem = ProductsForComboResponse['comprados']['items'][number];
type ElaboradoItem = ProductsForComboResponse['elaborados']['items'][number];

export function mapComprado(node: CompradoItem): Product {
  return {
    id: String(node.producto.id),
    code: '',
    name: node.producto.nombre,
    description: node.producto.descripcion,
    tipo: 'comprado',
    categoryId: '',
    unit: '',
    costPrice: node.costo_compra,
    salePrice: node.producto.precio,
    stock: node.stock_actual,
    minStock: 0,
    maxStock: 0,
    variations: [],
    isActive: true,
    hasVariations: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function mapElaboradoProduct(node: ElaboradoItem): Product {
  return {
    id: String(node.producto.id),
    code: '',
    name: node.producto.nombre,
    description: node.producto.descripcion,
    tipo: 'elaborado',
    categoryId: '',
    unit: '',
    costPrice: 0,
    salePrice: node.producto.precio,
    stock: 0,
    minStock: 0,
    maxStock: 0,
    variations: [],
    isActive: true,
    hasVariations: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function mapCombo(node: ComboNode): Combo {
  const items = node.detalles.map((d) => ({
    id: String(d.producto.id),
    productId: String(d.producto.id),
    productName: d.producto.nombre,
    productTipo: (TIPO_MAP[d.producto.tipo] ?? 'comprado') as 'comprado' | 'elaborado' | 'combo',
    quantity: d.cantidad,
    unitCost: d.producto.precio,
    esOpcional: d.opcional,
  }));

  return {
    id: String(node.producto.id),
    name: node.producto.nombre,
    description: node.producto.descripcion ?? '',
    items,
    price: node.producto.precio,
    costoTotal: items.reduce((s, i) => s + i.unitCost * i.quantity, 0),
    availability: node.cantidadProducible,
    isActive: true,
    codigoSin: node.producto.codigoSin ?? '',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
