// Tipos que devuelve GraphQL (snake_case del backend)
interface ComboProductoNode {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  tipo: string;
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
  elaborados: { nodes: ElaboradoNode[] };
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
  comprados: { nodes: CompradoNode[] };
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
  elaborados: { nodes: ElaboradoAjusteNode[] };
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
  elaborado: { id_Producto: number } | null;
  detalles: RecetaDetalleNode[];
}

// Shapes de respuesta para gql<T>()
export interface RecetasResponse {
  recetas: { nodes: RecetaNode[] };
}

export interface RecetaResponse {
  receta: RecetaNode;
}

export interface InsumosResponse {
  insumos: { nodes: InsumoNode[] };
}

export interface CombosResponse {
  combos: { nodes: ComboNode[] };
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
  ajustes: { nodes: AjusteNode[] };
}

interface SimpleProductNode {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  tipo: string;
}

export interface ProductsForComboResponse {
  comprados: { nodes: Array<{ costo_compra: number; stock_actual: number; producto: SimpleProductNode }> };
  elaborados: { nodes: Array<{ producto: SimpleProductNode }> };
}
