// Tipos que devuelve GraphQL (snake_case del backend)
export interface ComboDetalleNode {
  productoId: number;
  cantidad: number;
  opcional: boolean;
}

export interface ComboNode {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  cantidadProducible: number;
  productos: {
    productoId: number;
    cantidad: number;
    opcional: boolean;
  }[];
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

export interface ElaboradoNode {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  tipo: string;
  categoria_Id: number;
  unidad_medida: string;
  cantidadProducible: number;
}

export interface ElaboradosResponse {
  elaborados: ElaboradoNode[];
}

export interface ElaboradoResponse {
  elaborado: ElaboradoNode;
}

export interface RecetaDetalleNode {
  id_insumo: number;
  nombre: string;
  cantidad: number;
  merma: number;
  subTotal: number;
}

export interface RecetaNode {
  id: number;
  nombre: string;
  nota: string | null;
  id_Elaborado: number;
  porciones: number;
  detalles: RecetaDetalleNode[];
}

// Shapes de respuesta para gql<T>()
export interface RecetasResponse {
  recetas: RecetaNode[];
}

export interface RecetaResponse {
  receta: RecetaNode;
}

export interface InsumosResponse {
  insumos: InsumoNode[];
}

export interface CombosResponse {
  combos: { nodes: ComboNode[] };
}

export interface ProductsResponse {
  productos: {
    nodes: ProductNode[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}
