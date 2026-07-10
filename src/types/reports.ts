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

// ── Reporte Diario de Caja ────────────────────────────────────────────────

export interface ResumenDiarioCaja {
  cajasIniciadas: number;
  cajasCerradas: number;
  hayCajaAbierta: boolean;
  totalVentas: number;
  totalEfectivo: number;
  totalTarjeta: number;
  totalQr: number;
  totalIngresos: number;
  totalEgresos: number;
  saldoInicialTotal: number;
  balanceNeto: number;
}

export interface CajaDelDia {
  id: number;
  codigo: string;
  apertura: string;
  cierre: string | null;
  abiertaPor: string;
  cerradaPor: string | null;
  saldoInicial: number;
  totalVentas: number;
  totalEfectivo: number;
  totalTarjeta: number;
  totalQr: number;
  totalIngresos: number;
  totalEgresos: number;
  diferencia: number;
  estado: string;
  abiertaActualmente: boolean;
  movimientos: MovimientoCajaDelDia[];
}

export interface MovimientoCajaDelDia {
  id: number;
  codigoCaja: string;
  fecha: string;
  tipo: string;
  categoria: string;
  descripcion: string;
  monto: number;
  referencia?: string | null;
  nota?: string | null;
}

export interface ReporteCajaDiario {
  fecha: string;
  generadoEn: string;
  resumen: ResumenDiarioCaja;
  cajas: CajaDelDia[];
  movimientos: MovimientoCajaDelDia[];
}

// ── Reporte Mensual de Productos ──────────────────────────────────────────

export interface ResumenMensualProductos {
  totalFacturado: number;
  numeroFacturas: number;
  unidadesVendidas: number;
  productosDistintos: number;
  categoriasActivas: number;
}

export interface ProductoTop {
  idProducto: number;
  codigo: string;
  nombre: string;
  categoria: string;
  unidadesVendidas: number;
  ingresos: number;
  precioPromedio: number;
  numeroVentas: number;
  stockFinMes: number;
  stockInicioMes: number;
  stockPromedio: number;
  rotacion: number;
}

export interface ProductoPorCategoria {
  categoria: string;
  unidadesVendidas: number;
  ingresos: number;
  productosDistintos: number;
}

export interface ReporteProductosMensual {
  mes: number;
  anio: number;
  generadoEn: string;
  resumen: ResumenMensualProductos;
  topUnidades: ProductoTop[];
  topIngresos: ProductoTop[];
  topRotacion: ProductoTop[];
  porCategoria: ProductoPorCategoria[];
}
