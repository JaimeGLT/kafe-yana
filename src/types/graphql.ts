// Tipos que devuelve GraphQL (snake_case del backend)
interface ComboProductoNode {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  tipo: string;
  urlImagen?: string;
  codigoSin?: string;
}

export interface ComboDetalleNode {
  producto: ComboProductoNode;
  cantidad: number;
  opcional: boolean;
}

export interface ComboNode {
  producto: ComboProductoNode;
  detalles: ComboDetalleNode[];
  cantidadProducible: number;
}

export interface ProductNode {
  id: number;
  nombre: string;
  tipo: string;
  precioVenta: number;
  costo: number;
  stock: number;
  categoriaNombre: string;
  recetaName: string | null;
}

export interface InsumoNode {
  id: number;
  nombre: string;
  categoria: string;
  unidad_min_uso: string;
  unidad_compra: string;
  factor_conversion: number;
  costo: number;
  stock_actual: number;
  stock_min: number;
}

export interface ElaboradoRecetaDetalleNode {
  id_receta: number;
  id_insumo: number;
  cantidad: number;
  merma: number;
  subTotal: number;
  insumo: {
    id: number;
    nombre: string;
    categoria: string;
    unidad_min_uso: string;
    unidad_compra: string;
    factor_conversion: number;
    costo: number;
    stock_actual: number;
    stock_min: number;
  };
}

export interface ElaboradoVariacionOpcionAjuste {
  tipoAjuste: string;
  cantidad: number;
  id_Insumo: number;
  id_InsumoNuevo: number | null;
  insumoBase?: { id: number; nombre: string } | null;
  insumoNuevo?: { id: number; nombre: string } | null;
}

export interface ElaboradoVariacionNode {
  id: number;
  nombre: string;
  requerido: boolean;
  opciones: {
    id: number;
    nombre: string;
    ajustePrecio: number;
    id_variacion: number;
    ajustes: ElaboradoVariacionOpcionAjuste[];
  }[];
}

export interface ElaboradoNode {
  id_Producto: number;
  unidad_medida: string;
  producible: boolean;
  stock_actual: number;
  producto: {
    id: number;
    nombre: string;
    descripcion: string;
    precio: number;
    tipo: string;
    codigoSin?: string;
    categoria: { id: number; nombre: string; descripcion: string; estado: boolean; color: string } | null;
    detalles: { cantidad: number; opcional: boolean }[];
  };
  receta: {
    id: number;
    nombre: string;
    nota: string | null;
    cantidadProducible: number;
    porciones: number;
    detalles: ElaboradoRecetaDetalleNode[];
  } | null;
  variaciones: ElaboradoVariacionNode[];
}

export interface ElaboradosResponse {
  elaborados: { items: ElaboradoNode[] };
}

// — Ajustes de stock —

export interface CompradoNode {
  codigo_barra: string;
  unidad_medida: string;
  marca: string;
  ubicacion: string;
  costo_compra: number;
  stock_actual: number;
  stock_minimo: number;
  producto: {
    id: number;
    nombre: string;
    descripcion: string;
    precio: number;
    tipo: string;
    detalles: { cantidad: number; opcional: boolean }[];
  };
  disponible: boolean;
}

export interface CompradosResponse {
  comprados: { items: CompradoNode[] };
}

export interface RecetaDetalleAjusteNode {
  id_insumo: number;
  cantidad: number;
  merma: number;
}

export interface ElaboradoAjusteNode {
  id_Producto: number;
  unidad_medida: string;
  producible: boolean;
  producto: {
    id: number;
    nombre: string;
  };
  receta: {
    id: number;
    porciones: number;
    cantidadProducible: number;
    detalles: RecetaDetalleAjusteNode[];
  } | null;
  tipoPreparacion?: 'al_momento' | 'en_lote';
  stock_actual?: number;
}

export interface ElaboradosAjusteResponse {
  elaborados: { items: ElaboradoAjusteNode[] };
}

export interface ElaboradoResponse {
  elaborado: ElaboradoNode;
}

export interface RecetaDetalleNode {
  id_insumo: number;
  cantidad: number;
  merma: number;
  insumo: {
    id: number;
    nombre: string;
    costo: number;
    factor_conversion: number;
    unidad_min_uso: string;
    stock_actual: number;
  } | null;
}

export interface RecetaNode {
  id: number;
  nombre: string;
  nota: string | null;
  porciones: number;
  elaborado: { id_Producto: number } | null;
  detalles: RecetaDetalleNode[];
}

// Shapes de respuesta para gql<T>()
export interface RecetasResponse {
  recetas: { items: RecetaNode[] };
}

export interface RecetaResponse {
  receta: RecetaNode;
}

export interface RecetasPageResponse {
  recetas: { items: RecetaNode[] };
  insumos: { items: InsumoNode[] };
  elaborados: { items: ElaboradoNode[] };
}

export interface InsumosResponse {
  insumos: {
    items: InsumoNode[];
    totalCount: number;
  };
}

export interface CombosResponse {
  combos: { items: ComboNode[] };
}

// — Historial de ajustes —

export interface AjusteNode {
  id: number;
  fecha: string;
  nombre: string;
  tipo: string;
  ajuste: number;
  stockAnterior: number;
  stockNuevo: number;
  perdida: number;
  motivo: string;
  nota: string;
  usuario: string;
}

export interface AjustesResponse {
  ajustes: { items: AjusteNode[] };
}

export interface AdjustmentsDataResponse {
  ajustes: {
    totalCount: number;
    items: AjusteNode[]
  };
  comprados: { items: CompradoNode[] };
  insumos: { items: InsumoNode[] };
  elaborados: { items: ElaboradoAjusteNode[] };
}

export interface KardexProductNode {
  id: string;
  name: string;
  tipo: 'comprado' | 'elaborado';
  stock: number;
  unit: string;
}

export interface KardexProductsResponse {
  comprados: { items: { producto: { id: number; nombre: string }; stock_actual: number }[] };
  elaborados: { items: { id_Producto: number; producto: { id: number; nombre: string }; stock_actual: number }[] };
}

export interface KardexRawAjuste {
  fecha: string;
  id: number;
  nombre: string;
  tipo: string;
  ajuste: number;
  stockAnterior: number;
  stockNuevo: number;
  perdida: number;
  motivo: string;
  nota: string;
  usuario: string;
}

export interface KardexVentaDetalle {
  cantidad: number;
  nombre: string;
  precio: number;
  total: number;
}

export interface KardexRawVenta {
  fecha: string;
  codigo: string;
  estado: string;
  total: number;
  detalles: KardexVentaDetalle[];
}

export interface KardexMovementsResponse {
  ajustes: { nodes: KardexRawAjuste[] };
  ventas: { items: KardexRawVenta[] };
}

interface SimpleProductNode {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  tipo: string;
}

export interface ProductsForComboResponse {
  comprados: { items: Array<{ costo_compra: number; stock_actual: number; producto: SimpleProductNode }> };
  elaborados: { items: Array<{ producto: SimpleProductNode }> };
}

// — Kardex movimientos —

export interface MovimientoProductoNode {
  cantidad: number;
  costo_Unitario: number;
  fecha: string;
  id: number;
  referencia: string;
  stock_resultante: number;
  tipo: string;
  total: number;
}

export interface InsumoMovimientoNode {
  cantidad: number;
  costo_Unitario: number;
  fecha: string;
  id: number;
  referencia: string;
  stock_resultante: number;
  tipo: string;
  total: number;
}

export interface MovimientoProductoResponse {
  movimientoProducto: {
    items: MovimientoProductoNode[];
    totalCount: number;
  };
}

export interface InsumoMovimientosResponse {
  insumoMovimientos: {
    items: InsumoMovimientoNode[];
    totalCount: number;
  };
}

// — Kardex: items para selector —

export interface KardexSelectorItem {
  id: string;
  name: string;
  tipo: 'comprado' | 'elaborado' | 'combo' | 'insumo';
  stock: number;
  unit: string;
  costo?: number;
}

export interface KardexCompradoNode {
  producto: { id: number; nombre: string };
  stock_actual: number;
}

export interface KardexElaboradoNode {
  id_Producto: number;
  producto: { id: number; nombre: string };
  stock_actual: number;
}

export interface KardexComboNode {
  producto: { id: number; nombre: string };
  cantidadProducible: number;
}

export interface KardexInsumoNode {
  id: number;
  nombre: string;
  stock_actual: number;
  unidad_min_uso: string;
}

export interface KardexItemsResponse {
  comprados: { items: KardexCompradoNode[] };
  elaborados: { items: KardexElaboradoNode[] };
  combos: { items: KardexComboNode[] };
  insumos: { items: KardexInsumoNode[] };
}

// — Filter input types (from GraphQL schema) —

export interface StringOperationFilterInput {
  contains?: string;
  eq?: string;
  neq?: string;
  in?: string[];
  nin?: string[];
  startsWith?: string;
  endsWith?: string;
}

export interface IntOperationFilterInput {
  eq?: number;
  neq?: number;
  in?: number[];
  nin?: number[];
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
}

export interface ProductoFilterInput {
  and?: ProductoFilterInput[];
  or?: ProductoFilterInput[];
  id?: IntOperationFilterInput;
  nombre?: StringOperationFilterInput;
  descripcion?: StringOperationFilterInput;
  precio?: DecimalOperationFilterInput;
  tipo?: StringOperationFilterInput;
  categoria?: CategoriaFilterInput;
}

export interface CategoriaFilterInput {
  and?: CategoriaFilterInput[];
  or?: CategoriaFilterInput[];
  id?: IntOperationFilterInput;
  nombre?: StringOperationFilterInput;
  descripcion?: StringOperationFilterInput;
  estado?: BooleanOperationFilterInput;
  color?: StringOperationFilterInput;
}

export interface DecimalOperationFilterInput {
  eq?: number;
  neq?: number;
  in?: number[];
  nin?: number[];
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
}

export interface BooleanOperationFilterInput {
  eq?: boolean;
  neq?: boolean;
}

export interface CompradoFilterInput {
  and?: CompradoFilterInput[];
  or?: CompradoFilterInput[];
  codigo_barra?: StringOperationFilterInput;
  unidad_medida?: StringOperationFilterInput;
  marca?: StringOperationFilterInput;
  ubicacion?: StringOperationFilterInput;
  costo_compra?: DecimalOperationFilterInput;
  stock_actual?: IntOperationFilterInput;
  stock_minimo?: IntOperationFilterInput;
  disponible?: BooleanOperationFilterInput;
  id_Producto?: IntOperationFilterInput;
  producto?: ProductoFilterInput;
  id?: IntOperationFilterInput;
}

export interface InsumoFilterInput {
  and?: InsumoFilterInput[];
  or?: InsumoFilterInput[];
  id?: IntOperationFilterInput;
  nombre?: StringOperationFilterInput;
  categoria?: StringOperationFilterInput;
  unidad_min_uso?: StringOperationFilterInput;
  unidad_compra?: StringOperationFilterInput;
  factor_conversion?: IntOperationFilterInput;
  costo?: DecimalOperationFilterInput;
  stock_actual?: IntOperationFilterInput;
  stock_min?: IntOperationFilterInput;
}
