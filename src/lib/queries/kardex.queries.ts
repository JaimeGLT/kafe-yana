export const GET_KARDEX_ITEMS = `
  query GetKardexItems {
    comprados(first: 50, order: [{ producto: { nombre: ASC } }]) {
      nodes {
        producto { id nombre }
        stock_actual
      }
    }
    elaborados(first: 50, order: [{ producto: { nombre: ASC } }]) {
      nodes {
        id_Producto
        producto { id nombre }
        stock_actual
      }
    }
    combos(first: 50, order: [{ producto: { nombre: ASC } }]) {
      nodes {
        producto { id nombre }
        cantidadProducible
      }
    }
    insumos(first: 50, order: [{ nombre: ASC }]) {
      nodes {
        id
        nombre
        stock_actual
        unidad_min_uso
      }
    }
  }
`;

export const GET_PRODUCTO_MOVIMIENTOS = `
  query GetProductoMovimientos($id: Int!, $first: Int, $after: String) {
    movimientoProducto(id: $id, first: $first, after: $after) {
      totalCount
      pageInfo { hasNextPage endCursor }
      nodes {
        cantidad
        costo_Unitario
        fecha
        id
        referencia
        stock_resultante
        tipo
        total
      }
    }
  }
`;

export const GET_INSUMO_MOVIMIENTOS = `
  query GetInsumoMovimientos($id: Int!, $first: Int, $after: String) {
    insumoMovimientos(id: $id, first: $first, after: $after) {
      totalCount
      pageInfo { hasNextPage endCursor }
      nodes {
        cantidad
        costo_Unitario
        fecha
        id
        referencia
        stock_resultante
        tipo
        total
      }
    }
  }
`;