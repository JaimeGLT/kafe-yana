export const GET_ALL_INSUMOS = `
  query GetAllInsumos($skip: Int, $take: Int, $search: String, $categoria: String) {
    insumos(skip: $skip, take: $take, search: $search, categoria: $categoria) {
      items {
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
      totalCount
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