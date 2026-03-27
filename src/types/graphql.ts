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
  tipo: string;
  categoria_Id: number;
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

// Shapes de respuesta para gql<T>()
export interface CombosResponse {
  combos: ComboNode[];
}

export interface ProductsResponse {
  productos: {
    nodes: ProductNode[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}