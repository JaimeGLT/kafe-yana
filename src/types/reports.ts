export interface ReporteInventarioResponse {
  comprados: {
    nodes: CompradoNode[];
  };
  elaborados: {
    nodes: ElaboradoNode[];
  };
  insumos: {
    nodes: InsumoNode[];
  };
  categorias: {
    nodes: CategoriaNode[];
  };
}

export interface CompradoNode {
  codigo_barra: string;
  stock_actual: number;
  stock_minimo: number;
  costo_compra: number;
  disponible: boolean;
  producto: {
    id: number;
    nombre: string;
    descripcion: string;
    precio: number;
    categoria: {
      id: number;
      nombre: string;
      color: string;
    };
  };
}

export interface ElaboradoNode {
  id_Producto: number;
  stock_actual: number;
  producible: boolean;
  unidad_medida: string;
  producto: {
    id: number;
    nombre: string;
    categoria: {
      nombre: string;
      color: string;
    };
  };
}

export interface InsumoNode {
  id: number;
  nombre: string;
  categoria: string;
  stock_actual: number;
  stock_min: number;
  costo: number;
  unidad_min_uso: string;
  unidad_compra: string;
  factor_conversion: number;
}

export interface CategoriaNode {
  id: number;
  nombre: string;
  color: string;
}

export interface ReporteStats {
  totalProducts: number;
  totalInsumos: number;
  lowStockItems: number;
  totalValue: number;
}

export type InventoryReportItem = {
  id: string;
  code: string;
  name: string;
  tipo: 'comprado' | 'elaborado' | 'insumo';
  categoryName: string;
  categoryColor: string;
  stock: number;
  minStock: number;
  costPrice: number;
  available: boolean;
  unidad?: string;
  factorConversion?: number;
};

export type CriticalStockItem = {
  id: string;
  name: string;
  tipo: 'comprado' | 'insumo';
  categoryName: string;
  stock: number;
  minStock: number;
  unidad?: string;
  ratio: number;
};

export type ExpiringItem = {
  id: string;
  name: string;
  tipo: 'comprado' | 'insumo';
  categoryName: string;
  stock: number;
  minStock: number;
  unidad?: string;
  ratio: number;
};