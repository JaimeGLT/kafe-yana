export const GET_ALL_INSUMOS = `
  query GetAllInsumos {
    insumos {
      nodes {
        id
        nombre
        categoria
        unidad_min_uso
        unidad_compra
        factor_conversion
        costo
        stock_actual
        stock_min
      }
    }
  }
`

export const GET_INSUMO_BY_ID = `
  query GetInsumoById($id: Int!) {
    insumo(id: $id) {
      id
      nombre
      categoria
      unidad_min_uso
      unidad_compra
      factor_conversion
      costo
      stock_actual
      stock_min
    }
  }
`