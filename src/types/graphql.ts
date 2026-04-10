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
  id_insumo: number;
  cantidad: number;
  merma: number;
  insumo: {
    id: number;
    nombre: string;
    costo: number;
    stock_actual: number;
    unidad_min_uso: string;
  };
}

export interface ElaboradoVariacionNode {
  id: number;
  nombre: string;
  requerido: boolean;
  opciones: {
    id: number;
    nombre: string;
    ajustePrecio: number;
  }[];
}

export interface ElaboradoNode {
  id_Producto: number;
  unidad_medida: string;
  producto: {
    id: number;
    nombre: string;
    descripcion: string;
    precio: number;
    tipo: string;
    detalles: { cantidad: number; opcional: boolean }[];
  };
  receta: {
    id: number;
    nombre: string;
    nota: string | null;
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
}

export interface ElaboradosAjusteResponse {
  elaborados: ElaboradoAjusteNode[];
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
