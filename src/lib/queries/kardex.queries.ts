export const GET_KARDEX_ITEMS = `
  query GetKardexItems {
    comprados(skip: 0, take: 50) {
      items {
        producto { id nombre }
        stock_actual
      }
    }
    elaborados(skip: 0, take: 50) {
      items {
        id_Producto
        producto { id nombre }
        stock_actual
      }
    }
    combos(skip: 0, take: 50) {
      items {
        producto { id nombre }
        cantidadProducible
      }
    }
    insumos(skip: 0, take: 200) {
      items {
        id
        nombre
        stock_actual
        unidad_min_uso
      }
    }
  }
`;

export const GET_PRODUCTO_MOVIMIENTOS = `
  query GetProductoMovimientos($id: Int!, $skip: Int, $take: Int) {
    movimientoProducto(id: $id, skip: $skip, take: $take) {
      totalCount
      items {
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
  query GetInsumoMovimientos($id: Int!, $skip: Int, $take: Int) {
    insumoMovimientos(id: $id, skip: $skip, take: $take) {
      totalCount
      items {
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