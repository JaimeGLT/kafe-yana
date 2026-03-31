import type { InsumoNode } from '../../types/graphql';
import type { Insumo } from '../../types';

export function mapInsumo(n: InsumoNode): Insumo {
  return {
    id: String(n.id),
    code: String(n.id),
    name: n.nombre,
    categoriaInsumo: n.categoria,
    unidadMinima: n.unidad_min_uso,
    unidadCompra: n.unidad_compra,
    factorConversion: n.factor_conversion,
    costoCompra: n.costo,
    costoUnitario: n.factor_conversion > 0 ? n.costo / n.factor_conversion : 0,
    stock: n.stock_actual,
    stockMinimo: n.stock_min,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
